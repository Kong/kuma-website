---
title: MeshPassthrough
---

{% warning %}
This policy uses new policy matching algorithm.
{% endwarning %}

This policy enables {{site.mesh_product_name}} to configure traffic to external destinations that is allowed to pass outside the mesh.
When using this policy, the [passthrough mode](/docs/{{ page.release }}/networking/non-mesh-traffic/#outgoing) flag is ignored.

## TargetRef support matrix

{% tabs targetRef useUrlFragment=false %}
{% tab targetRef Sidecar %}
| `targetRef`           | Allowed kinds         |
| --------------------- | --------------------- |
| `targetRef.kind`      | `Mesh`, `MeshSubset`  |
{% endtab %}
{% if_version gte:2.9.x %}
{% tab targetRef Delegated Gateway %}
| `targetRef`             | Allowed kinds        |
| ----------------------- | -------------------- |
| `targetRef.kind`        | `Mesh`, `MeshSubset` |
{% endtab %}
{% endif_version %}
{% endtabs %}

To learn more about the information in this table, see the [matching docs](/docs/{{ page.release }}/policies/introduction).

## Configuration

{% warning %}
This policy doesn't work with sidecars without [transparent proxy](/docs/{{ page.release }}/{% if_version lte:2.8.x %}networking/transparent-proxying/#what-is-transparent-proxying{% endif_version %}{% if_version gte:2.9.x %}networking/transparent-proxy/introduction/{% endif_version %}).
{% endwarning %}

The following describes the default configuration settings of the `MeshPassthrough` policy:

- **`passthroughMode`**: (Optional) Defines behaviour for handling traffic. Allowed values: `All`, `None` and `Matched`. Default: `None`
  - **`All`** enables all traffic to pass through.
  - **`Matched`** allows only the traffic defined in `appendMatch`.
  - **`None`** disallows all traffic.
- **`appendMatch`**: List of destinations that are allowed to pass through. When `passthroughMode` is `All` or `None` this list is not used. It only takes effect when `passthroughMode` is `Matched`.
  - **`type`**: Defines what type of destination is allowed. Either `Domain`, `IP` or `CIDR`.
  - **`value`**: Destination address based on the defined `type`.
  - **`port`**: Port at which external destination is available. When not defined it caches all traffic to the address.
  - **`protocol`**: Defines protocol of the external destination.
    - **`tcp`**: **Can't be used when `type` is `Domain` (at TCP level we are not able to distinguish domain, in this case it is going to hijack whole traffic on this port)**.
    - **`tls`**: Should be used when TLS traffic is originated by the client application.
    - **`http`**
    - **`http2`**
    - **`grpc`**
  
### Wildcard DNS matching

`MeshPassthrough` policy allows you to create a match for a wildcard subdomain.

{% warning %}
Currently, support for partial subdomain matching is not implemented. For example, a match for `*w.example.com` will be rejected.
{% endwarning %}

{% policy_yaml wildcard %}
```yaml
type: MeshPassthrough
name: wildcard-passthrough
mesh: default
spec:
  targetRef:
    kind: Mesh
    proxyTypes: ["Sidecar"]
  default:
    passthroughMode: Matched
    appendMatch:
    - type: Domain
      value: '*.cluster-1.kafka.aws.us-east-2.com'
      protocol: tls
      port: 443
```
{% endpolicy_yaml %}

### Security

It is advised that the Mesh Operator is responsible for managing the `MeshPassthrough` policy.
This policy can introduce traffic outside of the mesh or even the cluster, and the Mesh Operator should be aware of this.
If you want to restrict access to `MeshPassthrough` to specific services, you must choose them manually.
If you rely on tags in the top-level `targetRef` you might consider securing them by using one of the following techniques:

* Make sure that service owners can't freely modify them (using something like [`kyverno`](https://kyverno.io/), [`OPA`](https://www.openpolicyagent.org/) or similar)
* Accept the risk of being able to "impersonate" a passthrough label and rely on auditing to figure out any violations.

### Limitations

* Due to the nature of some traffic, it is not possible to combine certain protocols on the same port. You can create a `MeshPassthrough` policy that handles `tcp`, `tls`, and one of `http`, `http2`, or `grpc` traffic on the same port. Layer 7 protocols cannot be distinguished, which could introduce unexpected behavior.
* It is currently not possible to route passthrough traffic through the [zone egress](/docs/{{ page.release }}/production/cp-deployment/zoneegress/#zone-egress). However, this feature will be implemented in the future.
* {% if_version gte:2.9.x %}Builtin gateway is not supported.{% endif_version %}{% if_version lte:2.8.x %}Gateways are currently not supported.{% endif_version %}

## Examples

### Disable passthrough for all sidecars

{% policy_yaml example1 %}
```yaml
type: MeshPassthrough
name: disable-passthrough
mesh: default
spec:
  targetRef:
    kind: Mesh
    proxyTypes: ["Sidecar"]
  default:
    passthroughMode: None
```
{% endpolicy_yaml %}

### Enable passthrough for a subset of sidecars

{% policy_yaml example2 %}
```yaml
type: MeshPassthrough
name: enable-passthrough
mesh: default
spec:
  targetRef:
    kind: MeshSubset
    proxyTypes: ["Sidecar"]
    tags:
      kuma.io/service: demo-app_kuma-demo_svc_5000
  default:
    passthroughMode: All
```
{% endpolicy_yaml %}

### Allow a subset of services to communicate with specific external endpoints

{% policy_yaml example3 %}
```yaml
type: MeshPassthrough
name: allow-some-passthrough
mesh: default
spec:
  targetRef:
    kind: MeshSubset
    proxyTypes: ["Sidecar"]
    tags:
      kuma.io/service: demo-app_kuma-demo_svc_5000
  default:
    passthroughMode: Matched
    appendMatch:
    - type: Domain
      value: httpbin.org
      protocol: tls
      port: 443
    - type: IP
      value: 10.240.15.39
      protocol: tcp
      port: 8888
    - type: CIDR
      value: 10.250.0.0/16
      protocol: tcp
      port: 10000
    - type: Domain
      value: '*.wikipedia.org'
      protocol: tls
      port: 443
    - type: Domain
      value: httpbin.dev
      protocol: http
      port: 80
```
{% endpolicy_yaml %}

## All policy options

{% json_schema MeshPassthroughs %}
