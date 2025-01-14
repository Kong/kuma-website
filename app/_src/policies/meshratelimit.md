---
title: MeshRateLimit
---

{% warning %}
This policy uses new policy matching algorithm.
Do **not** combine with [Rate Limit](/docs/{{ page.release }}/policies/rate-limit).
{% endwarning %}

This policy enables per-instance service request limiting. Policy supports rate limiting of HTTP/HTTP2 requests and TCP connections.

The `MeshRateLimit` policy leverages Envoy's [local rate limiting](https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/local_rate_limit_filter) for HTTP/HTTP2 and [local rate limit filter](https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/network_filters/local_rate_limit_filter) for TCP connections.

You can configure:
* how many HTTP requests are allowed in a specified time period
* how the HTTP service responds when the limit is reached
* how many TCP connections are allowed in a specified time period

The policy is applied per service instance. This means that if a service `backend` has 3 instances rate limited to 100 requests per second, the overall service rate limit is 300 requests per second.

Rate limiting supports an [ExternalService](/docs/{{ page.release }}/policies/external-services) only when `ZoneEgress` is enabled.

## TargetRef support matrix

{% if_version gte:2.6.x %}
{% tabs targetRef useUrlFragment=false %}
{% tab targetRef Sidecar %}
{% if_version lte:2.8.x %}
| `targetRef`             | Allowed kinds                                            |
| ----------------------- | -------------------------------------------------------- |
| `targetRef.kind`        | `Mesh`, `MeshSubset`, `MeshService`, `MeshServiceSubset` |
| `from[].targetRef.kind` | `Mesh`                                                   |
{% endif_version %}
{% if_version gte:2.9.x %}
| `targetRef`             | Allowed kinds                                            |
| ----------------------- | -------------------------------------------------------- |
| `targetRef.kind`        | `Mesh`, `MeshSubset`                                     |
| `from[].targetRef.kind` | `Mesh`                                                   |
{% endif_version %}
{% endtab %}

{% tab targetRef Builtin Gateway %}
| `targetRef`           | Allowed kinds                                             |
| --------------------- | --------------------------------------------------------- |
| `targetRef.kind`      | `Mesh`, `MeshGateway`, `MeshGateway` with listener `tags` |
| `to[].targetRef.kind` | `Mesh`                                                    |
{% endtab %}

{% tab targetRef Delegated Gateway %}

{% warning %}
`MeshRateLimit` isn't supported on delegated gateways.
{% endwarning %}

{% endtab %}

{% endtabs %}

{% endif_version %}
{% if_version lte:2.5.x %}

| TargetRef type    | top level | to  | from |
| ----------------- | --------- | --- | ---- |
| Mesh              | ✅        | ❌  | ✅   |
| MeshSubset        | ✅        | ❌  | ❌   |
| MeshService       | ✅        | ❌  | ❌   |
| MeshServiceSubset | ✅        | ❌  | ❌   |

{% endif_version %}

To learn more about the information in this table, see the [matching docs](/docs/{{ page.release }}/policies/introduction).

## Configuration

The `MeshRateLimit` policy supports both L4/TCP and L7/HTTP limiting. Envoy implements [Token Bucket](https://www.envoyproxy.io/docs/envoy/latest/api-v3/type/v3/token_bucket.proto) algorithm for rate limiting.

### HTTP Rate limiting

 - **`disabled`** - (optional) - should rate limiting policy be disabled
 - **`requestRate`** - configuration of the number of requests in the specific time window
   - **`num`** - the number of requests to limit
   - **`interval`** - the interval for which `requests` will be limited
 - **`onRateLimit`** (optional) - actions to take on RateLimit event
     - **`status`**  (optional) - the status code to return, defaults to `429`
     - **`headers`** - (optional) [headers](#headers) which should be added to every rate limited response

#### Headers

- **`set`** - (optional) - list of headers to set. Overrides value if the header exists.
  - **`name`** - header's name
  - **`value`** - header's value
- **`add`** - (optional) - list of headers to add. Appends value if the header exists.
  - **`name`** - header's name
  - **`value`** - header's value

### TCP Rate limiting

TCP rate limiting allows the configuration of a number of connections in the specific time window

 - **`disabled`** - (optional) - should rate limiting policy be disabled
 - **`connectionRate`** - configuration of the number of connections in the specific time window
   - **`num`** - the number of requests to limit
   - **`interval`** - the interval for which `connections` will be limited

## Examples

### HTTP Rate limit configured for service `backend` from all services in the Mesh

{% if_version lte:2.5.x %}
{% policy_yaml http-rate-limit %}
```yaml
type: MeshRateLimit
mesh: default
name: backend-rate-limit
spec:
  targetRef:
    kind: MeshSubset
    tags:
      app: backend
  from:
    - targetRef:
        kind: Mesh
      default:
        local:
          http:
            requestRate:
              num: 5
              interval: 10s
            onRateLimit:
              status: 423
              headers:
                set:
                  - name: "x-kuma-rate-limited"
                    value: "true"
```
{% endpolicy_yaml %}
{% endif_version %}
{% if_version gte:2.6.x %}
{% if_version lte:2.8.x %}
{% policy_yaml http-rate-limit-26x %}
```yaml
type: MeshRateLimit
mesh: default
name: backend-rate-limit
spec:
  targetRef:
    kind: MeshSubset
    proxyTypes: ["Sidecar"]
    tags:
      app: backend
  from:
    - targetRef:
        kind: Mesh
      default:
        local:
          http:
            requestRate:
              num: 5
              interval: 10s
            onRateLimit:
              status: 423
              headers:
                set:
                  - name: "x-kuma-rate-limited"
                    value: "true"
```
{% endpolicy_yaml %}
{% endif_version %}
{% endif_version %}
{% if_version gte:2.9.x %}
{% policy_yaml http-rate-limit-namespaced namespace=kuma-demo %}
```yaml
type: MeshRateLimit
mesh: default
name: backend-rate-limit
spec:
  targetRef:
    kind: MeshSubset
    proxyTypes: ["Sidecar"]
    tags:
      app: backend
  from:
    - targetRef:
        kind: Mesh
      default:
        local:
          http:
            requestRate:
              num: 5
              interval: 10s
            onRateLimit:
              status: 423
              headers:
                set:
                  - name: "x-kuma-rate-limited"
                    value: "true"
```
{% endpolicy_yaml %}
{% endif_version %}

### TCP rate limit for service backend from all services in the Mesh

{% if_version lte:2.5.x %}
{% policy_yaml from-backend %}
```yaml
type: MeshRateLimit
name: backend-rate-limit
mesh: default
spec:
  targetRef:
    kind: MeshSubset
    tags:
      app: backend
  from:
    - targetRef:
        kind: Mesh
      default:
        local:
          tcp:
            connectionRate:
              num: 5
              interval: 10s
```
{% endpolicy_yaml %}
{% endif_version %}
{% if_version gte:2.6.x %}
{% if_version lte:2.8.x %}
{% policy_yaml from-backend-26x %}
```yaml
type: MeshRateLimit
name: backend-rate-limit
mesh: default
spec:
  targetRef:
    kind: MeshSubset
    proxyTypes: ["Sidecar"]
    tags:
      app: backend
  from:
    - targetRef:
        kind: Mesh
      default:
        local:
          tcp:
            connectionRate:
              num: 5
              interval: 10s
```
{% endpolicy_yaml %}
{% endif_version %}
{% endif_version %}
{% if_version gte:2.9.x %}
{% policy_yaml from-backend-namespaced namespace=kuma-demo %}
```yaml
type: MeshRateLimit
name: backend-rate-limit
mesh: default
spec:
  targetRef:
    kind: MeshSubset
    proxyTypes: ["Sidecar"]
    tags:
      app: backend
  from:
    - targetRef:
        kind: Mesh
      default:
        local:
          tcp:
            connectionRate:
              num: 5
              interval: 10s
```
{% endpolicy_yaml %}
{% endif_version %}

## All policy options

{% json_schema MeshRateLimits %}
