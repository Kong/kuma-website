---
title: Kubernetes annotations and labels
content-type: reference
---

This page provides a complete list of all the annotations you can specify when you run {{site.mesh_product_name}} in Kubernetes mode.

## Labels

### `kuma.io/sidecar-injection`

Enable or disable sidecar injection.

**Example**

Used on the namespace it will inject the sidecar in all pods created in the namespace:

```yaml
apiVersion: v1
kind: Namespace
metadata:
 name: default
 labels:
   kuma.io/sidecar-injection: enabled
[...]
```

Used on a deployment using pod template it will inject the sidecar in all pods managed by this deployment:

```yaml
apiVersion: v1
kind: Deployment
metadata:
  name: my-deployment
spec:
  template:
    metadata:
      labels:
        kuma.io/sidecar-injection: enabled
[...]
```

Labeling pods or deployments will take precedence on the namespace annotation.

{% if_version gt:2.8.x %}
### `kuma.io/mesh`

Associate Pods with a particular Mesh. Label value must be the name of a Mesh resource.

**Example**

It can be used on an entire namespace:

```yaml
apiVersion: v1
kind: Namespace
metadata:
 name: default
 labels:
   kuma.io/mesh: default
[...]
```

It can be used on a pod:

```yaml
apiVersion: v1
kind: Pod
metadata:
 name: backend
 labels:
   kuma.io/mesh: default
[...]
```

Labeling pods or deployments will take precedence on the namespace annotation.
{% endif_version %}

### `kuma.io/system-namespace`

This label is used to indicate the Namespace that Kuma stores its secrets in.
It's automatically set on the Namespace the Helm chart is installed into by a
Job started by Helm.

## Annotations

{% if_version lte:2.7.x %}
### `kuma.io/mesh`

Associate Pods with a particular Mesh. Annotation value must be the name of a Mesh resource.

**Example**

It can be used on an entire namespace:

```yaml
apiVersion: v1
kind: Namespace
metadata:
 name: default
 annotations:
   kuma.io/mesh: default
[...]
```

It can be used on a pod:

```yaml
apiVersion: v1
kind: Pod
metadata:
 name: backend
 annotations:
   kuma.io/mesh: default
[...]
```

Annotating pods or deployments will take precedence on the namespace annotation.
{% endif_version %}

### `kuma.io/gateway`

Lets you specify the Pod should run in gateway mode. Inbound listeners are not generated.

**Example**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: gateway
spec:
  selector:
    matchLabels:
      app: gateway
  template:
    metadata:
      labels:
        app: gateway
      annotations:
        kuma.io/gateway: enabled
[...]
```

### `kuma.io/ingress`

Marks the Pod as the Zone Ingress. Needed for multizone communication -- provides the entry point for traffic from other zones.

**Example**

```yaml
apiVersion: v1
kind: Pod
metadata:
 name: zone-ingress
 annotations:
   kuma.io/ingress: enabled
[...]
```

### `kuma.io/ingress-public-address`

Specifies the public address for Ingress. If not provided, {{site.mesh_product_name}} picks the address from the Ingress Service.

**Example**

```yaml
apiVersion: v1
kind: Pod
metadata:
 name: zone-ingress
 annotations:
   kuma.io/ingress: enabled
   kuma.io/ingress-public-address: custom-address.com
[...]
```

### `kuma.io/ingress-public-port`

Specifies the public port for Ingress. If not provided, {{site.mesh_product_name}} picks the port from the Ingress Service.

**Example**

```yaml
apiVersion: v1
kind: Pod
metadata:
 name: zone-ingress
 annotations:
   kuma.io/ingress: enabled
   kuma.io/ingress-public-port: "1234"
[...]
```

### `kuma.io/direct-access-services`

Defines a comma-separated list of Services that can be accessed directly.

**Example**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: example
  annotations:
    kuma.io/direct-access-services: test-app_playground_svc_80,test-app_playground_svc_443
    kuma.io/transparent-proxying: enabled
    kuma.io/transparent-proxying-inbound-port: [...]
    kuma.io/transparent-proxying-outbound-port: [...]
```

When you provide this annotation, {{site.mesh_product_name}} generates a listener for each IP address and redirects traffic through a `direct-access` cluster that's configured to encrypt connections.

These listeners are needed because transparent proxy and mTLS assume a single IP per cluster (for example, the ClusterIP of a Kubernetes Service). If you pass requests to direct IP addresses, Envoy considers them unknown destinations and manages them in passthrough mode -- which means they're not encrypted with mTLS. The `direct-access` cluster enables encryption anyway.

{% warning %}
**WARNING**: You should specify this annotation only if you really need it. Generating listeners for every endpoint makes the xDS snapshot very large.
{% endwarning %}

{% if_version gte:2.9.x %}

### `kuma.io/application-probe-proxy-port`

Specifies the port on which "Application Probe Proxy" listens. Application Probe Proxy coverts `HTTPGet`, `TCPSocket` and `gRPC` probes in the pod to `HTTPGet` probes and converts back to their original types before sending to the application when actual probe requests are received. 

Application Probe Proxy by default listens on port `9001` and it suppresses the "Virtual Probes" feature. By setting it to `0`, you can disable this feature and activate "Virtual Probes" unless it's also disabled.

**Example**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: example
  annotations:
    kuma.io/application-probe-proxy-port: "9001"
[...]
```

{% endif_version %}

### `kuma.io/virtual-probes`

Enables automatic converting of HttpGet probes to virtual probes. The virtual probe is served on a sub-path of the insecure port specified with `kuma.io/virtual-probes-port` -- for example, `:8080/health/readiness` -> `:9000/8080/health/readiness`, where `9000` is the value of the `kuma.io/virtual-probes-port` annotation.

**Example**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: example
  annotations:
    kuma.io/virtual-probes: enabled
    kuma.io/virtual-probes-port: "9000"
[...]
```

### `kuma.io/virtual-probes-port`

Specifies the insecure port for listening on virtual probes.

### `kuma.io/sidecar-env-vars`

Semicolon (`;`) separated list of environment variables for the {{site.mesh_product_name}} sidecar.

**Example**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: example
  annotations:
    kuma.io/sidecar-env-vars: TEST1=1;TEST2=2
```

### `kuma.io/container-patches`

Specifies the list of names of `ContainerPatch` resources to be applied on
`kuma-init` and `kuma-sidecar` containers.

More information about how to use `ContainerPatch` you can find at
[Custom Container Configuration](/docs/{{ page.release }}/production/dp-config/dpp-on-kubernetes/#custom-container-configuration).

**Example**

It can be used on a resource describing workload (i.e. `Deployment`, `DaemonSet`
or `Pod`):

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  namespace: {{site.mesh_namespace}}
  name: example
spec:
  replicas: 1
  selector:
    matchLabels:
      app: example
  template:
    metadata:
      labels:
        app: example
      annotations:
        kuma.io/container-patches: container-patch-1,container-patch-2
    spec: [...]
```

### `prometheus.metrics.kuma.io/port`

Lets you override the `Mesh`-wide default port that Prometheus should scrape metrics from.

**Example**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: example
  annotations:
    prometheus.metrics.kuma.io/port: "1234"
```

### `prometheus.metrics.kuma.io/path`

Lets you override the `Mesh`-wide default path that Prometheus should scrape metrics from.

**Example**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: example
  annotations:
    prometheus.metrics.kuma.io/path: "/custom-metrics"
```

### `kuma.io/builtindns`

Tells the sidecar to use its builtin DNS server.

**Example**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: example
  annotations:
    kuma.io/builtindns: enabled
```

### `kuma.io/builtindnsport`

Port the builtin DNS server should listen on for DNS queries.

**Example**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: example
  annotations:
    kuma.io/builtindns: enabled
    kuma.io/builtindnsport: "15053"
```

### `kuma.io/ignore`

A boolean to mark a resource as ignored by {{site.mesh_product_name}}.
It currently only works for services.
This is useful when transitioning to {{site.mesh_product_name}} or to temporarily ignore some entities.

**Example**

```yaml
apiVersion: v1
kind: Service
metadata:
  name: example
  annotations:
    kuma.io/ignore: "true"
```

### `traffic.kuma.io/exclude-inbound-ports`

List of inbound ports to exclude from traffic interception by the {{site.mesh_product_name}} sidecar.

**Example**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: example
  annotations:
    traffic.kuma.io/exclude-inbound-ports: "1234,1235"
```

### `traffic.kuma.io/exclude-outbound-ports`

List of outbound ports to exclude from traffic interception by the {{site.mesh_product_name}} sidecar.

**Example**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: example
  annotations:
    traffic.kuma.io/exclude-outbound-ports: "1234,1235"
```

### `kuma.io/transparent-proxying-experimental-engine`

Enable or disable experimental transparent proxy engine on Pod.
Default is `disabled`.

**Example**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: example
  annotations:
    kuma.io/transparent-proxying-experimental-engine: enabled
```

### `kuma.io/envoy-admin-port`

Specifies the port for Envoy Admin API. If not set, default admin port 9901 will be used.

**Example**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: example
  annotations:
    kuma.io/envoy-admin-port: "8801"
```

### `kuma.io/envoy-log-level`

Specifies the log level for Envoy system logs to enable. The available log levels are `trace`, `debug`, `info`, `warning/warn`, `error`, `critical`, `off`. The default is `info`.

**Example**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: example
  annotations:
    kuma.io/envoy-log-level: "warning"
```

{% if_version gte:2.5.x %}

### `kuma.io/envoy-component-log-level`

Specifies the log level for Envoy system logs to enable by components. See `ALL_LOGGER_IDS` in [logger.h from Envoy source](https://github.com/envoyproxy/envoy/blob/main/source/common/common/logger.h#L36) for a list of available components.

**Example**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: example
  annotations:
    kuma.io/envoy-component-log-level: "upstream:debug,connection:trace"
```

{% endif_version %}

### `kuma.io/service-account-token-volume`

Volume (specified in the pod spec) containing a service account token for {{site.mesh_product_name}} to inject into the sidecar.

**Example**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: example
  annotations:
    kuma.io/service-account-token-volume: "token-vol"
spec:
  automountServiceAccountToken: false
  serviceAccount: example
  containers:
    - image: busybox
      name: busybox
  volumes:
    - name: token-vol
      projected:
        sources:
          - serviceAccountToken:
              expirationSeconds: 7200
              path: token
              audience: "https://kubernetes.default.svc"
          - configMap:
              items:
                - key: ca.crt
                  path: ca.crt
              name: kube-root-ca.crt
          - downwardAPI:
              items:
                - fieldRef:
                    apiVersion: v1
                    fieldPath: metadata.namespace
                  path: namespace
```

### `kuma.io/transparent-proxying-reachable-services`

{% capture reachable-services-docs-link %}/docs/{{ page.release }}/{% if_version lte:2.8.x %}production/dp-config/transparent-proxying/#{% endif_version %}{% if_version gte:2.9.x %}networking/transparent-proxy/{% endif_version %}reachable-services{% endcapture %}

A comma separated list of `kuma.io/service` to indicate which services this communicates with.
For more details see the [reachable services docs]({{ reachable-services-docs-link }}).

**Example**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: example-app
  namespace: kuma-example
spec:
  ...
  template:
    metadata:
      ...
      annotations:
        # a comma separated list of kuma.io/service values
        kuma.io/transparent-proxying-reachable-services: "redis_kuma-demo_svc_6379,elastic_kuma-demo_svc_9200"
    spec:
      containers:
        ...
```

### `kuma.io/transparent-proxying-ebpf`

When transparent proxy is installed with eBPF mode, you can disable it for particular workloads if necessary.

<!-- vale Vale.Terms = NO -->
{% capture tproxy-ebpf-link %}/docs/{{ page.release }}/{% if_version lte:2.8.x %}production/dp-config/transparent-proxying/{% endif_version %}{% if_version gte:2.9.x %}networking/transparent-proxy/introduction/{% endif_version %}#transparent-proxy-with-ebpf-experimental{% endcapture %}
<!-- vale Vale.Terms = YES -->

For more details see the [transparent proxying with eBPF docs]({{ tproxy-ebpf-link }}).

**Example**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: example-app
  namespace: kuma-example
spec:
  [...]
  template:
    metadata:
      [...]
      annotations:
        kuma.io/transparent-proxying-ebpf: disabled
    spec:
      containers:
        [...]
```

### `kuma.io/transparent-proxying-ebpf-bpf-fs-path`

Path to BPF FS if different than default (`/sys/fs/bpf`)

For more details see the [transparent proxying with eBPF docs]({{ tproxy-ebpf-link }}).

**Example**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: example-app
  namespace: kuma-example
spec:
  [...]
  template:
    metadata:
      [...]
      annotations:
        kuma.io/transparent-proxying-ebpf-bpf-fs-path: /custom/bpffs/path
    spec:
      containers:
        [...]
```

### `kuma.io/transparent-proxying-ebpf-cgroup-path`

cgroup2 path if different than default (`/sys/fs/cgroup`)

For more details see the [transparent proxying with eBPF docs]({{ tproxy-ebpf-link }}).

**Example**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: example-app
  namespace: kuma-example
spec:
  [...]
  template:
    metadata:
      [...]
      annotations:
        kuma.io/transparent-proxying-ebpf-cgroup-path: /custom/cgroup2/path
    spec:
      containers:
        [...]
```

### `kuma.io/transparent-proxying-ebpf-programs-source-path`

Custom path for eBPF programs to be loaded when installing transparent proxy

For more details see the [transparent proxying with eBPF docs]({{ tproxy-ebpf-link }}).

**Example**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: example-app
  namespace: kuma-example
spec:
  [...]
  template:
    metadata:
      [...]
      annotations:
        kuma.io/transparent-proxying-ebpf-programs-source-path: /custom/ebpf/programs/source/path
    spec:
      containers:
        [...]
```

### `kuma.io/transparent-proxying-ebpf-tc-attach-iface`

Name of the network interface which should be used to attach to it TC-related
eBPF programs. By default {{site.mesh_product_name}} will use first, non-loopback
interface it'll find.

For more details see the [transparent proxying with eBPF docs]({{ tproxy-ebpf-link }}).

**Example**

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: example-app
  namespace: kuma-example
spec:
  [...]
  template:
    metadata:
      [...]
      annotations:
        kuma.io/transparent-proxying-ebpf-tc-attach-iface: eth3
    spec:
      containers:
        [...]
```

{% if_version gte:2.4.x %}
### `kuma.io/wait-for-dataplane-ready`

Define if you want the kuma-sidecar container to wait for the dataplane to be ready before starting app container.
Read relevant [Data plane on Kubernetes](/docs/{{ page.release }}/production/dp-config/dpp-on-kubernetes/#waiting-for-the-dataplane-to-be-ready) section for more information.

{% endif_version %}

### `prometheus.metrics.kuma.io/aggregate-<name>-enabled`

Define if `kuma-dp` should scrape metrics from the application that has been defined in the `Mesh` configuration. Default value: `true`. For more details see the [applications metrics docs](/docs/{{ page.release }}/policies/traffic-metrics#expose-metrics-from-applications)

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: example
  annotations:
    prometheus.metrics.kuma.io/aggregate-app-enabled: "false"
spec: ...
```

### `prometheus.metrics.kuma.io/aggregate-<name>-path`

Define path, which `kuma-dp` sidecar has to scrape for prometheus metrics. Default value: `/metrics`. For more details see the [applications metrics docs](/docs/{{ page.release }}/policies/traffic-metrics#expose-metrics-from-applications)

**Example**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: example
  annotations:
    prometheus.metrics.kuma.io/aggregate-app-path: "/stats"
spec: ...
```

### `prometheus.metrics.kuma.io/aggregate-<name>-port`

Define port, which `kuma-dp` sidecar has to scrape for prometheus metrics. For more details see the [applications metrics docs](/docs/{{ page.release }}/policies/traffic-metrics#expose-metrics-from-applications)

**Example**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: example
  annotations:
    prometheus.metrics.kuma.io/aggregate-app-port: "1234"
spec: ...
```

### `kuma.io/transparent-proxying-inbound-v6-port`

Define the port to use for [IPv6](/docs/{{ page.release }}/production/dp-config/ipv6/) traffic. To turn off IPv6 set this to 0.

**Example**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: example
  annotations:
    kuma.io/transparent-proxying-inbound-v6-port: "0"
spec: ...
```

### `kuma.io/sidecar-drain-time`

Allows specifying drain time of {{site.mesh_product_name}} DP sidecar. The default value is 30s.
The default could be changed using [the control-plane configuration](/docs/{{ page.release }}/reference/kuma-cp) or `KUMA_RUNTIME_KUBERNETES_INJECTOR_SIDECAR_CONTAINER_DRAIN_TIME` env.

**Example**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: example
  annotations:
    kuma.io/sidecar-drain-time: "10s"
spec: ...
```
{% if_version gte:2.3.x %}
### `kuma.io/init-first`

Allows specifying that the {{site.mesh_product_name}} init container should run first (ahead of any other init containers). 
The default is `false` if omitted. Setting this to `true` may be desirable for security, as it would prevent network access for other init containers. The order is _not_ guaranteed, as other mutating admission webhooks may further manipulate this ordering. 

**Example**

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: example
  annotations:
    kuma.io/init-first: "true"
spec: ...
```
{% endif_version %}
