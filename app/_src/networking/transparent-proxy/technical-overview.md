---
title: Technical Overview
content_type: explanation
---

{% assign docs = "/docs/" | append: page.release %}
{% assign Kuma = site.mesh_product_name %}

## What is transparent proxying?

A transparent proxy is a type of server that can intercept network traffic to and from a service without changes to the client application code. In the case of {{ Kuma }} it is used to capture traffic and redirect it to `kuma-dp` so Mesh policies can be applied.

To accomplish this, {{ Kuma }} utilizes [`iptables`](https://linux.die.net/man/8/iptables) and offers additional, experimental support for [`eBPF`]({{ docs }}/production/dp-config/cni/#merbridge-cni-with-ebpf). The examples provided in this section will concentrate on iptables to clearly illustrate the point.

Below is a high level visualization of how transparent proxying works

<!-- vale Vale.Spelling = NO -->
{% mermaid %}
 sequenceDiagram
 autonumber
     participant Browser as Client<br>(for example, mobile app)
     participant Kernel as Kernel
     participant ServiceMeshIn as kuma sidecar(15006)
     participant Node as example.com:5000<br>(Front-end App)
     participant ServiceMeshOut as kuma sidecar(15001)
     Browser->>+Kernel: GET / HTTP1.1<br>Host: example.com:5000
 
     rect rgb(233,233,233)
     Note over Kernel,ServiceMeshOut: EXAMPLE.COM
     Note over Node: (Optional)<br> Apply inbound policies
     Note over ServiceMeshOut: (Optional)<br> Apply outbound policies
     Kernel->>+ServiceMeshIn: Capture inbound TCP traffic<br>and Redirect to the sidecar<br> (listener port 15006)
     ServiceMeshIn->>+Node: Redirect to the<br>original destination <br>(example.com:5000)
         Node->>+Kernel: Send the <br>Front-end Response
     Kernel->>+ServiceMeshOut: Capture outbound TCP traffic<br>and Redirect to the sidecar<br> (listener port 15001)
     end
     ServiceMeshOut->>+Browser: Response to Client
     %% Note over Browser,ServiceMeshOut: Traffic Flow Sequence
{% endmermaid %}
<!-- vale Vale.Spelling = YES -->

## A life without transparent proxying

If you choose to not use transparent proxying, or you are running on a platform where transparent proxying is not available, there are some additional considerations.

- You will need to specify inbound and outbound ports to capture traffic on
- `.mesh` addresses are unavailable
- You may need to update your `application` code to use the new capture ports
- No support for [VirtualOutbound]({{ docs }}/policies/virtual-outbound) policies

Without manipulating iptables to redirect traffic you will need to explicitly tell `kuma-dp` where to listen to capture it. As noted, this can require changes to your application code as seen below:

Here we specify that we will listen on the address `10.119.249.39:15000` (line 7). This in turn creates an envoy listener for the port. When consuming a service over this `15000` it will cause traffic to redirect to `127.0.0.1:5000` (line 8) where our app is running. 

```yaml
  type: Dataplane
  mesh: default
  name: demo-app
  networking: 
    address: 10.119.249.39 
    inbound: 
      - port: 15000
        servicePort: 5000
        serviceAddress: 127.0.0.1
        tags: 
          kuma.io/service: app
          kuma.io/protocol: http
```

## How it works

<!-- vale Google.Headings = NO -->
### Inbound TCP traffic
<!-- vale Google.Headings = YES -->

The inbound port, `15006`, is the default for capturing requests to the system. This rule allows us to capture and redirect ALL TCP traffic to port `15006`.

```sh
iptables --table nat --append KUMA_MESH_INBOUND_REDIRECT --protocol tcp --jump REDIRECT --to-ports 15006
```

An envoy listener is also created for this port which we can see in the admin interface (`:9901/config_dump`). In the below example you can see the listener created on all interfaces (line 8) and port `15006` (line 9).

```json
     "name": "inbound:passthrough:ipv4",
     "active_state": {
      "listener": {
       "@type": "type.googleapis.com/envoy.config.listener.v3.Listener",
       "name": "inbound:passthrough:ipv4",
       "address": {
        "socket_address": {
         "address": "0.0.0.0",
         "port_value": 15006
        }
       },
      ...
       "use_original_dst": true,
       "traffic_direction": "INBOUND",
```

Notice the setting [use_original_dst](https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/listener/v3/listener.proto) (line 13). This listener will send traffic to a special type of cluster, `ORIGINAL_DST`. This is important since we are redirecting traffic here based on the iptables rules, which means when this service was requested it was not likely it was requested over this port, `15006`, but rather whatever the target application is listening on (i.e. `demo-app` port `5000`).

```json
     "name": "inbound:10.244.0.6:5000",
     "active_state": {
      "version_info": "9dac7d53-3560-4ad4-ba42-c7e563db958e",
      "listener": {
       "@type": "type.googleapis.com/envoy.config.listener.v3.Listener",
       "name": "inbound:10.244.0.6:5000",
       "address": {
        "socket_address": {
         "address": "10.244.0.6",
         "port_value": 5000
        }
       }
      }
     }
```

Using the Kuma counter demo app as an example, when the client needs to talk to the node app, it does not do so over `15006`, but rather the actual application port, `5000`. This is the "transparent" part of the proxying as it is not expected that apps will need to be redesigned or changed in any way to utilize mesh.

So, when the request comes into the system, the iptables rule grabs the traffic and sends it to envoy port `15006`. Once here, we check where the request was originally intended to go, in this case `5000` and forward it.

A further review of the envoy config will show our Node app listener where the IP address, `10.244.0.6`, is that of the `demo-app` pod. Now that envoy is in control of the traffic we can now (optionally) apply filters/Mesh policies.


```json
     "name": "inbound:10.244.0.6:5000",
     "active_state": {
      "version_info": "9dac7d53-3560-4ad4-ba42-c7e563db958e",
      "listener": {
       "@type": "type.googleapis.com/envoy.config.listener.v3.Listener",
       "name": "inbound:10.244.0.6:5000",
       "address": {
        "socket_address": {
         "address": "10.244.0.6",
         "port_value": 5000
        }
       },
          "filter_chains": [
            {
              "filters": [
                {
                  "name": "envoy.filters.network.http_connection_manager",
                  "typed_config": {
                    "@type": "type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager",
                    "stat_prefix": "localhost_5000",
                    "route_config": {
                    "http_filters": [
                      {
                        "name": "envoy.filters.http.fault",
                        "typed_config": {
                          "@type": "type.googleapis.com/envoy.extensions.filters.http.fault.v3.HTTPFault",
                          "delay": {
                            "fixed_delay": "5s",
                            "percentage": {
                              "numerator": 50,
                              "denominator": "TEN_THOUSAND"
...
```

<!-- vale Google.Headings = NO -->
### Outbound TCP traffic
<!-- vale Google.Headings = YES -->

The outbound port, `15001`, is the default for capturing outbound traffic from the system. That is, traffic leaving the mesh. This rule allow us to capture and redirect all TCP traffic to `15001`.

```sh
iptables --table nat --append KUMA_MESH_OUTBOUND_REDIRECT --protocol tcp --jump REDIRECT --to-ports 15001
```

An envoy listener is also created for this port which we can see in the admin interface (`:9901/config_dump`). In the below example you can see the listener created on all interfaces (line 8) and port `15001` (line 9). This will allow us to capture and outbound traffic policies.

```json
     "name": "outbound:passthrough:ipv4",
     "active_state": {
      "listener": {
       "@type": "type.googleapis.com/envoy.config.listener.v3.Listener",
       "name": "outbound:passthrough:ipv4",
       "address": {
        "socket_address": {
         "address": "0.0.0.0",
         "port_value": 15001
        }
       },
      ...
       "use_original_dst": true,
       "traffic_direction": "OUTBOUND"
```
