---
title: DNS
---

{{site.mesh_product_name}} ships with DNS resolver to provide service naming - a mapping of hostname to Virtual IPs (VIPs) of services registered in {{site.mesh_product_name}}.

The usage of {{site.mesh_product_name}} DNS is only relevant when [transparent proxying](/docs/{{ page.release }}/{% if_version lte:2.8.x %}production/dp-config/transparent-proxying/{% endif_version %}{% if_version gte:2.9.x %}networking/transparent-proxy/introduction/{% endif_version %}) is used.

## How it works

{{site.mesh_product_name}} DNS server responds to type `A` and `AAAA` DNS requests, and answers with `A` or `AAAA` records, for example `redis.mesh. 60 IN A 240.0.0.100` or `redis.mesh. 60 IN AAAA fd00:fd00::100`.

The virtual IPs are allocated by the control plane from the configured CIDR (by default `240.0.0.0/4`) , by constantly scanning the services available in all {{site.mesh_product_name}} meshes.
When a service is removed, its VIP is also freed, and {{site.mesh_product_name}} DNS does not respond for it with `A` and `AAAA` DNS record.
Virtual IPs are stable (replicated) between instances of the control plane and data plane proxies.

Once a new VIP is allocated or an old VIP is freed, the control plane configures the data plane proxy with this change.

All name lookups are handled locally by the data plane proxy, not by the control plane.
This approach allows for more robust handling of name resolution.
For example, when the control plane is down, a data plane proxy can still resolve DNS.

The data plane proxy DNS consists of:

- an Envoy DNS filter provides responses from the mesh for DNS records
- a CoreDNS instance launched by `kuma-dp` that sends requests between the Envoy DNS filter and the original host DNS
- iptable rules that will redirect the original DNS traffic to the local CoreDNS instance

As the DNS requests are sent to the Envoy DNS filter first, any DNS name that exists inside the mesh will always resolve to the mesh address.
This in practice means that DNS name present in the mesh will "shadow" equivalent names that exist outside the mesh.

{{site.mesh_product_name}} DNS is not a service discovery mechanism, it does not return real IP address of service instances.
Instead, it always returns a single VIP that is assigned to the relevant service in the mesh. This makes for a unified view of all services within a single zone or across multiple zones.

The default TTL is 60 seconds, to ensure the client synchronizes with {{site.mesh_product_name}} DNS and to account for any intervening changes.

### Naming

By default, Kuma generates domain names of `<kuma.io/service tag>.mesh` accessible on port `80`.
More advanced configuration including customizing the port is available using [Virtual Outbounds](/docs/{{ page.release }}/policies/virtual-outbound).

{% if_version gte:2.9.x %}
If you use [MeshService](/docs/{{ page.release }}/networking/meshservice), [MeshExternalService](/docs/{{ page.release }}/networking/meshexternalservice), or MeshMultiZoneService the domains are generated using [HostnameGenerator](/docs/{{ page.release }}/networking/hostnamegenerator).
{% endif_version %}

## Installation

{% tabs installation useUrlFragment=false %}
{% tab installation Kubernetes %}

{{site.mesh_product_name}} DNS is enabled by default whenever kuma-dp sidecar proxy is injected.

{% endtab %}
{% tab installation Universal %}

Follow the instruction in {% if_version lte:2.8.x %}[transparent proxying](/docs/{{ page.release }}/production/dp-config/transparent-proxying/){% endif_version %}{% if_version gte:2.9.x %}[Installing Transparent Proxy on Universal](/docs/{{ page.release }}/networking/transparent-proxy/universal/#installation){% endif_version %}.

{% endtab %}
{% endtabs %}

### Special considerations

This mode implements advanced networking techniques, so take special care for the following cases:

- The mode can safely be used with the [{{site.mesh_product_name}} CNI plugin](/docs/{{ page.release }}/production/dp-config/cni/).
- In mixed IPv4 and IPv6 environments, it's recommended that you specify an [IPv6 virtual IP CIDR](/docs/{{ page.release }}/production/dp-config/ipv6/).

### Overriding the CoreDNS configuration

In some cases it might be useful for you to configure the default CoreDNS configuration.

{% if_version gte:2.6.x %}
{{site.mesh_product_name}} supports overriding the CoreDNS configuration from control plane for both Kubernetes and Universal installations; for Universal installations, {{site.mesh_product_name}} also supports overriding from data planes. When overriding from control plane, all the data planes in the mesh will use the overridden DNS configuration.
{% endif_version %}

{% tabs override useUrlFragment=false %}
{% tab override Kubernetes %}
{% if_version gte:2.6.x %}
Only overriding from control plane is supported.

To override, you can [configure](/docs/{{ page.release }}/reference/kuma-cp/) the bootstrap server in `kuma-cp`:

```yaml
bootstrapServer:
  corefileTemplatePath: "/path/to/mounted-corefile-template" # ENV: KUMA_BOOTSTRAP_SERVER_PARAMS_COREFILE_TEMPLATE_PATH
```

You'll also need to mount the DNS configuration template file into the control plane by adding an extra configMap, here are the steps: 

Create a configmap in the namespace in which the control plane is installed:

```sh
# create the namespace if it does not exist
kubectl create namespace {{site.mesh_namespace}}

# create the configmap, make sure the file exist on disk
kubectl create --namespace {{site.mesh_namespace}} configmap corefile-template \
  --from-file corefile-template=/path/to/corefile-template-on-disk 
```

Point to this configmap when installing {{site.mesh_product_name}}:

{% tabs install-control-plane useUrlFragment=false %}
{% tab install-control-plane Kubernetes (kumactl) %}

```sh
kumactl install control-plane \
  --env-var "KUMA_BOOTSTRAP_SERVER_PARAMS_COREFILE_TEMPLATE_PATH=/path/to/mounted-corefile-template" \
  --set "{{site.set_flag_values_prefix}}controlPlane.extraConfigMaps[0].name=corefile-template" \
  --set "{{site.set_flag_values_prefix}}controlPlane.extraConfigMaps[0].mountPath=/path/to/mounted-corefile-template/corefile-template" \
  | kubectl apply -f -
```
{% endtab %}
{% tab install-control-plane Kubernetes (HELM) %}

```sh
helm install --namespace {{site.mesh_namespace}} \
  --set "{{site.set_flag_values_prefix}}controlPlane.envVars.KUMA_BOOTSTRAP_SERVER_PARAMS_COREFILE_TEMPLATE_PATH=/path/to/mounted-corefile-template" \
  --set "{{site.set_flag_values_prefix}}controlPlane.extraConfigMaps[0].name=corefile-template" \
  --set "{{site.set_flag_values_prefix}}controlPlane.extraConfigMaps[0].mountPath=/path/to/mounted-corefile-template/corefile-template" \
  {{site.mesh_helm_install_name}} {{site.mesh_helm_repo}}
```

{% endtab %}
{% endtabs %}
{% endif_version %}

{% if_version lte:2.5.x %}
At this moment, there is no builtin option to override CoreDNS configuration.
{% endif_version %}
{% endtab %}
{% tab override Universal %}
{% if_version lte:2.5.x %}
{{site.mesh_product_name}} supports overriding DNS from data planes.
{% endif_version %}
{% if_version gte:2.6.x %}
Both overriding from the control plane and data planes are supported.
{% endif_version %}

{% if_version gte:2.6.x %}
To override DNS configuration from the control plane, you can [configure](/docs/{{ page.release }}/reference/kuma-cp/) the bootstrap server in `kuma-cp`:

```yaml
bootstrapServer:
  corefileTemplatePath: "/path/to/mounted-corefile-template" # ENV: KUMA_BOOTSTRAP_SERVER_PARAMS_COREFILE_TEMPLATE_PATH
```

Please make sure the file path do exist on disk.
{% endif_version %}

To override DNS configuration from data planes, use `--dns-coredns-config-template-path` as an argument to `kuma-dp`. {% if_version gte:2.6.x %}When the data plane is connecting to a control plane that also has DNS configuration overridden, overridden from data plane will take precedence.{% endif_version %}

{% endtab %}
{% endtabs %}

Once supported, you'll need to prepare a DNS configuration file to be used for overriding. This file is a [CoreDNS configuration](https://coredns.io/manual/toc/) that is processed as a go-template.

Editing should base on [the existing and default configuration](https://github.com/kumahq/kuma/blob/master/app/kuma-dp/pkg/dataplane/dnsserver/Corefile). For example, you may use the following configuration to make the DNS server not respond errors to IPv6 queries when your cluster has IPv6 disabled:

{% raw %}

```
.:{{ .CoreDNSPort }} {
    # add a plugin to return NOERROR for IPv6 queries
    template IN AAAA . {
       rcode NOERROR
       fallthrough
    }

    forward . 127.0.0.1:{{ .EnvoyDNSPort }}
    # We want all requests to be sent to the Envoy DNS Filter, unsuccessful responses should be forwarded to the original DNS server.
    # For example: requests other than A, AAAA and SRV will return NOTIMP when hitting the envoy filter and should be sent to the original DNS server.
    # Codes from: https://github.com/miekg/dns/blob/master/msg.go#L138
    alternate NOTIMP,FORMERR,NXDOMAIN,SERVFAIL,REFUSED . /etc/resolv.conf
    prometheus localhost:{{ .PrometheusPort }}
    errors
}

.:{{ .CoreDNSEmptyPort }} {
    template ANY ANY . {
      rcode NXDOMAIN
    }
}
```

{% endraw %}

## Configuration

You can [configure](/docs/{{ page.release }}/reference/kuma-cp/) {{site.mesh_product_name}} DNS in `kuma-cp`:

```yaml
dnsServer:
  CIDR: "240.0.0.0/4" # ENV: KUMA_DNS_SERVER_CIDR
  domain: "mesh" # ENV: KUMA_DNS_SERVER_DOMAIN
  serviceVipEnabled: true # ENV: KUMA_DNS_SERVER_SERVICE_VIP_ENABLED
```

The `CIDR` field sets the IP range of virtual IPs. The default `240.0.0.0/4` is reserved for future IPv4 use and is guaranteed to be non-routable. We strongly recommend to not change this value unless you have a specific need for a different IP range.

The `domain` field specifies the default `.mesh` DNS zone that {{site.mesh_product_name}} DNS provides resolution for. It's only relevant when `serviceVipEnabled` is set to `true`.

The `serviceVipEnabled` field defines if there should be a vip generated for each `kuma.io/service`. This can be disabled for performance reason and [virtual-outbound](/docs/{{ page.release }}/policies/virtual-outbound) provides a more flexible way to do this.

## Usage

Consuming a service handled by {{site.mesh_product_name}} DNS, whether from {{site.mesh_product_name}}-enabled Pod on Kubernetes or VM with `kuma-dp`, is based on the automatically generated `kuma.io/service` tag. The resulting domain name has the format `{service tag}.mesh`. For example:

```
<kuma-enabled-pod>$ curl http://echo-server_echo-example_svc_1010.mesh:80
<kuma-enabled-pod>$ curl http://echo-server_echo-example_svc_1010.mesh
```


You can also use a [DNS RFC1035 compliant name](https://www.ietf.org/rfc/rfc1035.txt) by replacing the underscores in the service name with dots. For example:

```
<kuma-enabled-pod>$ curl http://echo-server.echo-example.svc.1010.mesh:80
<kuma-enabled-pod>$ curl http://echo-server.echo-example.svc.1010.mesh
```

The default listeners created on the VIP default to port `80`, so the port can be omitted with a standard HTTP client.

{{site.mesh_product_name}} DNS allocates a VIP for every service within a mesh. Then, it creates an outbound virtual listener for every VIP. If you inspect the result of `curl localhost:9901/config_dump`, you can see something similar to:

```json
    {
     "name": "outbound:240.0.0.1:80",
     "active_state": {
      "version_info": "51adf4e6-287e-491a-9ae2-e6eeaec4e982",
      "listener": {
       "@type": "type.googleapis.com/envoy.api.v2.Listener",
       "name": "outbound:240.0.0.1:80",
       "address": {
        "socket_address": {
         "address": "240.0.0.1",
         "port_value": 80
        }
       },
       "filter_chains": [
        {
         "filters": [
          {
           "name": "envoy.filters.network.tcp_proxy",
           "typed_config": {
            "@type": "type.googleapis.com/envoy.config.filter.network.tcp_proxy.v2.TcpProxy",
            "stat_prefix": "echo-server_kuma-test_svc_80",
            "cluster": "echo-server_kuma-test_svc_80"
           }
          }
         ]
        }
       ],
       "deprecated_v1": {
        "bind_to_port": false
       },
       "traffic_direction": "OUTBOUND"
      },
      "last_updated": "2020-07-06T14:32:59.732Z"
     }
    }
```
