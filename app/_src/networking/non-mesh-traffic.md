---
title: Non-mesh traffic
---

## Incoming

When mTLS is enabled, clients from outside the mesh can't reach the applications inside the mesh. 
If you want to allow external clients to consume mesh services see 
the [Permissive mTLS](/docs/{{ page.release }}/policies/mutual-tls/#permissive-mtls) mode.

{% warning %}
Without [transparent proxying](/docs/{{ page.release }}/{% if_version lte:2.8.x %}production/dp-config/transparent-proxying/{% endif_version %}{% if_version gte:2.9.x %}networking/transparent-proxy/introduction/{% endif_version %})
TLS check on Envoy can be bypassed. You should take action to secure the application ports. 
{% endwarning %}

## Outgoing

In its default setup, {{site.mesh_product_name}} allows any non-mesh traffic to pass Envoy without applying any policy. 
For instance if a service needs to send a request to `http://example.com`, 
all requests won't be logged even if a traffic logging is enabled in the mesh where the service is deployed.
The passthrough mode is enabled by default on all the dataplane proxies in transparent mode in a Mesh. 
This behavior can be changed by setting the `networking.outbound.passthrough` in the Mesh resource. Example:

{% tabs passthrough-mode useUrlFragment=false %}
{% tab passthrough-mode Kubernetes %}
```yaml
apiVersion: kuma.io/v1alpha1
kind: Mesh
metadata:
  name: default
spec:
  networking:
    outbound:
      passthrough: false
```
{% endtab %}
{% tab passthrough-mode Universal %}
```yaml
type: Mesh
name: default
networking:
  outbound:
    passthrough: false
```
{% endtab %}
{% endtabs %}

When `networking.outbound.passthrough` is `false`, no traffic to any non-mesh resource can leave the Mesh.

{% if_version gte:2.8.x %}
{% tip %}
Since version 2.8.x, you can take advantage of a new policy, [MeshPassthrough](/docs/{{ page.release }}/policies/meshpassthrough), which allows you to enable passthrough traffic for a specific group of sidecars and only for specific destinations.
{% endtip %}
{% endif_version %}

{% tip %}
Before setting `networking.outbound.passthrough` to `false`, double-check Envoy stats that no traffic is flowing through `pass_through` cluster. 
Otherwise, you will block the traffic which may cause the instability of the system.
{% endtip %}

### Policies don't apply to non-mesh traffic

If you need to change configuration for non-mesh traffic 
you can use a {% if_version lte:2.5.x inline:true %}Proxy Template{% endif_version %}{% if_version inline:true gte:2.6.x %}MeshProxyPatch{% endif_version %}.

#### Circuit Breaker

Default values:

```yaml
maxConnections: 1024
maxPendingRequests: 1024
maxRequests: 1024
maxRetries: 3
```

{% if_version lte:2.5.x inline:true %}[ProxyTemplate](/docs/{{ page.release }}/policies/proxy-template){% endif_version %}{% if_version inline:true gte:2.6.x %}[MeshProxyPatch](/docs/{{ page.release }}/policies/meshproxypatch){% endif_version %} to change the defaults:

{% if_version lte:2.5.x %}
{% tabs passthrough-thresholds useUrlFragment=false %}
{% tab passthrough-thresholds Kubernetes %}
```yaml
apiVersion: kuma.io/v1alpha1
kind: ProxyTemplate
mesh: default
metadata:
  name: custom-template-1
spec:
  selectors:
    - match:
        kuma.io/service: "*"
  conf:
    imports:
      - default-proxy
    modifications:
      - cluster:
          operation: patch
          match:
            name: "outbound:passthrough:ipv4"
          value: |
            circuit_breakers: {
              thresholds: [
                {
                  max_connections: 2048,
                  max_pending_requests: 2048,
                  max_requests: 2048,
                  max_retries: 4
                }
              ]
            }
```
{% endtab %}

{% tab passthrough-thresholds Universal %}
```yaml
type: ProxyTemplate
mesh: default
name: custom-template-1
selectors:
    - match:
        kuma.io/service: "*"
conf:
  imports:
    - default-proxy
  modifications:
    - cluster:
        operation: patch
        match:
          name: "outbound:passthrough:ipv4"
        value: |
          circuit_breakers: {
            thresholds: [
              {
                max_connections: 2048,
                max_pending_requests: 2048,
                max_requests: 2048,
                max_retries: 4
              }
            ]
          }
```
{% endtab %}
{% endtabs %}
{% endif_version %}
{% if_version gte:2.6.x %}
{% policy_yaml passthrough-thresholds-mpp %}
```yaml
type: MeshProxyPatch
mesh: default
name: custom-mpp-1
spec:
  targetRef:
    kind: Mesh
  default:
    appendModifications:
      - cluster:
          operation: Patch
          match:
            name: "outbound:passthrough:ipv4"
          value: |
            circuit_breakers: {
              thresholds: [
                {
                  max_connections: 2048,
                  max_pending_requests: 2048,
                  max_requests: 2048,
                  max_retries: 4
                }
              ]
            }
```
{% endpolicy_yaml %}
{% endif_version %}

#### Timeouts

Default values:

```yaml
connectTimeout: 10s
tcp:
  idleTimeout: 1h
```

{% if_version lte:2.5.x inline:true %}Proxy Template{% endif_version %}{% if_version inline:true gte:2.6.x %}MeshProxyPatch{% endif_version %} to change the defaults:

{% if_version lte:2.5.x %}
{% tabs passthrough-timeouts useUrlFragment=false %}
{% tab passthrough-timeouts Kubernetes %}
```yaml
apiVersion: kuma.io/v1alpha1
kind: ProxyTemplate
mesh: default
metadata:
  name: custom-template-1
spec:
  selectors:
    - match:
        kuma.io/service: "*"
  conf:
    imports:
      - default-proxy
    modifications:
      - cluster:
          operation: patch
          match:
            name: "outbound:passthrough:ipv4"
          value: |
            connect_timeout: "99s"
      - networkFilter:
          operation: patch
          match:
            name: "envoy.filters.network.tcp_proxy"
            listenerName: "outbound:passthrough:ipv4"
          value: |
            name: envoy.filters.network.tcp_proxy
            typedConfig:
              '@type': type.googleapis.com/envoy.extensions.filters.network.tcp_proxy.v3.TcpProxy
              idleTimeout: "3h"
```
{% endtab %}

{% tab passthrough-timeouts Universal %}
```yaml
type: ProxyTemplate
mesh: default
name: custom-template-1
selectors:
    - match:
        kuma.io/service: "*"
conf:
  imports:
    - default-proxy
  modifications:
    - cluster:
        operation: patch
        match:
          name: "outbound:passthrough:ipv4"
        value: |
          connect_timeout: "99s"
    - networkFilter:
        operation: patch
        match:
          name: "envoy.filters.network.tcp_proxy"
          listenerName: "outbound:passthrough:ipv4"
        value: |
          name: envoy.filters.network.tcp_proxy
          typedConfig:
            '@type': type.googleapis.com/envoy.extensions.filters.network.tcp_proxy.v3.TcpProxy
            idleTimeout: "3h"
```
{% endtab %}
{% endtabs %}
{% endif_version %}
{% if_version gte:2.6.x %}
{% policy_yaml passthrough-timeouts-mpp %}
```yaml
type: MeshProxyPatch
mesh: default
name: custom-mpp-1
spec:
  targetRef:
    kind: Mesh
  default:
    appendModifications:
      - cluster:
          operation: Patch
          match:
            name: "outbound:passthrough:ipv4"
          jsonPatches:
            - op: replace
              path: /connectTimeout
              value: 99s
      - networkFilter:
          operation: Patch
          match:
            name: "envoy.filters.network.tcp_proxy"
            listenerName: "outbound:passthrough:ipv4"
          value: |
            name: envoy.filters.network.tcp_proxy
            typedConfig:
              '@type': type.googleapis.com/envoy.extensions.filters.network.tcp_proxy.v3.TcpProxy
              idleTimeout: "3h"
```
{% endpolicy_yaml %}
{% endif_version %}
