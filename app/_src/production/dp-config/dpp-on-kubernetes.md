---
title: Data plane on Kubernetes
content_type: how-to
---

On Kubernetes the [`Dataplane`](/docs/{{ page.release }}/production/dp-config/dpp#dataplane-entity) entity is automatically created for you, and because transparent proxying is used to communicate between the service and the sidecar proxy, no code changes are required in your applications.

The {{ site.mesh_product_name }} control plane injects a `kuma-sidecar` container into your `Pod`'s container. If
you're not using the CNI, it also injects a `kuma-init` into `initContainers` to
setup [transparent proxying](/docs/{{ page.release }}/{% if_version lte:2.8.x %}production/dp-config/transparent-proxying/{% endif_version %}{% if_version gte:2.9.x %}/networking/transparent-proxy/introduction/{% endif_version %}).

You can control whether {{site.mesh_product_name}} automatically injects the data plane proxy by **labeling** either the Namespace or the Pod with
`kuma.io/sidecar-injection=enabled`, e.g.

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: kuma-example
  labels:
    # inject {{site.mesh_product_name}} sidecar into every Pod in that Namespace,
    # unless a user explicitly opts out on per-Pod basis
    kuma.io/sidecar-injection: enabled
```

To opt out of data-plane injection into a particular `Pod`, you need to **label** it
with `kuma.io/sidecar-injection=disabled`, e.g.

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
      labels:
        # indicate to {{site.mesh_product_name}} that this Pod doesn't need a sidecar
        kuma.io/sidecar-injection: disabled
    spec:
      containers:
        ...
```

Once your pod is running you can see the data plane CRD that matches it using `kubectl`:

```shell
kubectl get dataplanes <podName>
```

## Tag generation

When `Dataplane` entities are automatically created, all labels from Pod are converted into `Dataplane` tags.
Labels with keys that contains `kuma.io/` are not converted because they are reserved to {{site.mesh_product_name}}.
The following tags are added automatically and cannot be overridden using Pod labels.

* `kuma.io/service`: Identifies the service name based on a Service that selects a Pod. This will be of format `<name>_<namespace>_svc_<port>` where `<name>`, `<namespace>` and `<port>` are from the Kubernetes service that is associated with this particular pod.
  When a pod is spawned without being associated with any Kubernetes Service resource the data plane tag will be `kuma.io/service: <name>_<namespace>_svc`, where `<name>` and`<namespace>` are extracted from the Pod resource metadata.
* `kuma.io/zone`: Identifies the zone name in a [multi-zone deployment](/docs/{{ page.release }}/production/deployment/multi-zone/).
* `kuma.io/protocol`: Identifies [the protocol](/docs/{{ page.release }}/policies/protocol-support-in-kuma) that was defined by the `appProtocol` field on the Service that selects the Pod.
* `k8s.kuma.io/namespace`: Identifies the Pod's namespace. Example: `kuma-demo`.
* `k8s.kuma.io/service-name`: Identifies the name of Kubernetes Service that selects the Pod. Example: `demo-app`.
* `k8s.kuma.io/service-port`: Identifies the port of Kubernetes Service that selects the Pod. Example: `80`.

{% tip %}
- If a Kubernetes service exposes more than 1 port, multiple inbounds will be generated all with different `kuma.io/service`.
- If a pod is attached to more than one Kubernetes service, multiple inbounds will also be generated. 
{% endtip %}

### Example

```yaml
apiVersion: v1
kind: Pod
metadata: 
  name: my-app
  namespace: my-namespace
  labels:
    foo: bar
    app: my-app
spec:
  # ...
---
apiVersion: v1
kind: Service
metadata:
  name: my-service
  namespace: my-namespace
spec:
  selector:
    app: my-app
  type: ClusterIP
  ports:
    - name: port1
      protocol: TCP
      appProtocol: http
      port: 80
      targetPort: 8080
    - name: port2
      protocol: TCP
      appProtocol: grpc
      port: 1200
      targetPort: 8081
---
apiVersion: v1
kind: Service
metadata:
  name: my-other-service
  namespace: my-namespace
spec:
  selector:
    foo: bar 
  type: ClusterIP
  ports:
    - protocol: TCP
      appProtocol: http
      port: 81
      targetPort: 8080
```

Will generate the following inbounds in your {{site.mesh_product_name}} dataplane:

```yaml
...
inbound:
  - port: 8080
    tags:
      kuma.io/protocol: http
      kuma.io/service: my-service_my-namespace_svc_80
      k8s.kuma.io/service-name: my-service
      k8s.kuma.io/service-port: "80"
      k8s.kuma.io/namespace: my-namespace
      # Labels coming from your pod
      app: my-app
      foo: bar
  - port: 8081
    tags:
      kuma.io/protocol: grpc
      kuma.io/service: my-service_my-namespace_svc_1200
      k8s.kuma.io/service-name: my-service
      k8s.kuma.io/service-port: "1200"
      k8s.kuma.io/namespace: my-namespace
      # Labels coming from your pod
      app: my-app
      foo: bar
  - port: 8080
    tags:
      kuma.io/protocol: http
      kuma.io/service: my-other-service_my-namespace_svc_81
      k8s.kuma.io/service-name: my-other-service
      k8s.kuma.io/service-port: "81"
      k8s.kuma.io/namespace: my-namespace
      # Labels coming from your pod
      app: my-app
      foo: bar
```

Notice how `kuma.io/service` is built on `<serviceName>_<namespace>_svc_<port>` and `kuma.io/protocol` is the `appProtocol` field of your service entry.

## Capabilities

{% if_version lte:2.3.x %}
The only required
[capability](https://kubernetes.io/docs/tasks/configure-pod-container/security-context/#set-capabilities-for-a-container) for the sidecar is `NET_BIND_SERVICE`.
{% endif_version %}{% if_version gte:2.4.x %}
The sidecar doesn't need any [capabilities](https://kubernetes.io/docs/tasks/configure-pod-container/security-context/#set-capabilities-for-a-container) and works with `drop: ["ALL"]`.
{% endif_version %} Use [`ContainerPatch`](#custom-container-configuration) to
control capabilities for the sidecar.

## Lifecycle

{% if_version gte:2.7.x %}
The lifecycle management has been significantly improved
with the `SidecarContainers` feature introduced in Kubernetes v1.29.

### Kubernetes sidecar containers

In order to enable the use of this feature with {{ site.mesh_product_name }} you should enable the
`experimental.sidecarContainers`/`KUMA_EXPERIMENTAL_SIDECAR_CONTAINERS` option.

This feature supports adding the injected Kuma container to
`initContainers` with `restartPolicy: Always`, which marks it as a sidecar
container. Refer to the
[Kubernetes docs](https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/)
to learn more about how they work.

In effect, the following lifecycle subsections are irrelevant when using this feature.
When enabled, the ordering of the sidecar startup and shutdown is enforced by Kubernetes.

In order to use the mesh in an init container, ensure that it comes after `kuma-sidecar`.
{{ site.mesh_product_name }} injects its sidecar at the front of the list but can't guarantee that its webhook runs last.

Draining incoming connections gracefully is handled via a `preStop` hook
on the `kuma-sidecar` container.

However, remember that if the `terminationGracePeriodSeconds` has elapsed, ordering
and thus correct behavior of the sidecar is no longer guaranteed.
The grace period should be set long enough that your workload finishes shutdown
before it elapses.

As always, your application should itself initiate graceful shutdown
when it receives SIGTERM. In particular, remember that Kubernetes works largely
asynchronously. So if your application exits "too quickly" it's possible that
requests are still routed to the `Pod` and they fail. There's [an article at
learnk8s.io](https://learnk8s.io/graceful-shutdown#how-to-gracefully-shut-down-pods)
with an overview of the problem and potential solutions.

It ultimately comes down to "just wait a little bit" when your application
receives SIGTERM. This can either be done in the application itself or you can
add a `preStop` command to your container:

```yaml
kind: Deployment
# ...
spec:
  template:
    spec:
      containers:
      - name: app-container
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sleep", "15"]
```
{% endif_version %}

### Joining the mesh

On Kubernetes, `Dataplane` resource is automatically created by kuma-cp. For each `Pod` with sidecar-injection label, a new
`Dataplane` resource will be created.

To join the mesh in a graceful way, we need to first make sure the application is ready to serve traffic before it can be considered a valid traffic destination.

#### Init containers

Due to the way that {{site.mesh_product_name}} implements transparent proxying and sidecars in Kubernetes,
network calls from init containers while running a mesh can be a challenge.

##### Network calls to outside of the mesh

The common pitfall is the idea that it's possible to order init containers so that the mesh init container is run after other init containers.
However, when injecting these init containers into a Pod via webhooks, such as the Vault init container, there is no assurance of the order.
The ordering of init containers also doesn't provide a solution when the {{site.mesh_product_name}} CNI is used, as traffic redirection to the sidecar occurs even before
any init container runs.

To solve this issue, start the init container with a specific user ID and exclude specific ports from interception.
Remember also about excluding port of DNS interception. Here is an example of annotations to enable HTTPS traffic for a container running as user id `1234`.

```yaml
apiVersion: v1
king: Deployment
metadata:
  name: my-deployment
spec:
  template:
    metadata:
      annotations:
        traffic.kuma.io/exclude-outbound-tcp-ports-for-uids: "443:1234"
        traffic.kuma.io/exclude-outbound-udp-ports-for-uids: "53:1234"
    spec:
      initContainers:
      - name: my-init-container
        ...
        securityContext:
          runAsUser: 1234
```

##### Network calls inside the mesh with mTLS enabled

In this scenario, using the init container is simply impossible
because `kuma-dp` is responsible for encrypting the traffic and only runs after all init containers have exited.

{% if_version gte:2.4.x %}
### Waiting for the dataplane to be ready

By default, containers start in arbitrary order, so an app container can start even though the sidecar container might not be ready to receive traffic.

Making initial requests, such as connecting to a database, can fail for a brief period after the pod starts. 

To mitigate this problem try setting
* `runtime.kubernetes.injector.sidecarContainer.waitForDataplaneReady` to `true`, or 
* [kuma.io/wait-for-dataplane-ready](/docs/{{ page.release }}/reference/kubernetes-annotations/#kumaiowait-for-dataplane-ready) annotation to `true`
so that the app container waits for the dataplane container to be ready to serve traffic.

{% warning %}

The `waitForDataplaneReady` setting relies on the fact that defining a `postStart` hook causes Kubernetes to run containers sequentially based on their order of occurrence in the `containers` list.
This isn't documented and could change in the future.
It also depends on injecting the `kuma-sidecar` container as the first container in the pod, which isn't guaranteed since other mutating webhooks can rearrange the containers.
{% endwarning %}

{% endif_version %}

### Leaving the mesh

To leave the mesh in a graceful shutdown, we need to remove the traffic destination from all the clients before shutting it down.

When the {{site.mesh_product_name}} sidecar receives a SIGTERM signal it:

1. Starts draining Envoy listeners.
1. Waits the entire drain time.
1. Terminates.

While draining, Envoy can still accept connections, however:

1. It is marked unhealthy on the Envoy Admin `/ready` endpoint.
1. It sends `connection: close` for HTTP/1.1 requests and the `GOAWAY` frame for HTTP/2.
   This forces clients to close their connection and reconnect to the new instance.

You can read the [Kubernetes docs](https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/#pod-termination) to learn how Kubernetes handles the `Pod` lifecycle. Here is the summary including the parts relevant for {{site.mesh_product_name}}.

Whenever a user or system deletes a `Pod`, Kubernetes does the following:
1. It marks the `Pod` as terminated.
1. For every container concurrently it:
    1. Executes any pre stop hook if defined.
    1. Sends a SIGTERM signal.
    1. Waits until container is terminated for maximum of graceful termination time (by default 60s).
    1. Sends a SIGKILL to the container.
1. It removes the `Pod` object from the system.

When `Pod` is marked as terminated, {{site.mesh_product_name}}, the CP marks the `Dataplane` object unhealthy, which triggers a configuration update to all the clients in order to remove it as a destination.
This can take a couple of seconds depending on the size of the mesh, resources available to the CP, XDS configuration interval, etc.

If the application served by the {{site.mesh_product_name}} sidecar quits immediately after the SIGTERM signal, there is a high chance that clients will still try to send traffic to this destination.

To mitigate this, we need to either
* Support graceful shutdown in the application. For example, the application should wait X seconds to exit after receiving the first SIGTERM signal.
* Add a pre-stop hook to postpone stopping the application container. Example:
  ```yaml
  apiVersion: apps/v1
  kind: Deployment
  metadata:
    name: redis
  spec:
    template:
      spec:
        containers:
        - name: redis
          image: "redis"
          lifecycle:
            preStop:
              exec:
                command: ["/bin/sleep", "15"]
  ```

When a `Pod` is deleted, its matching `Dataplane` resource is deleted as well. This is possible thanks to the
[owner reference](https://kubernetes.io/docs/concepts/overview/working-with-objects/owners-dependents/) set on the `Dataplane` resource.

## Custom Container Configuration

If you want to modify the default container configuration you can use
the `ContainerPatch` Kubernetes CRD. It allows configuration of both sidecar
and init containers. `ContainerPatch` resources are namespace scoped and can
only be applied in a namespace where **{{site.mesh_product_name}} CP** is running.

{% warning %}
In the vast majority of cases you shouldn't need to override the sidecar and
init container configurations. `ContainerPatch` is a feature which requires good
understanding of both {{site.mesh_product_name}} and Kubernetes.
{% endwarning %}

A `ContainerPatch` specification consists of the list of [JSON patch](https://datatracker.ietf.org/doc/html/rfc6902)
strings that describe the modifications. Consult [the entire
resource schema](#schema).

### Example

{% warning %}
When using ContainerPath, every `value` field must be a string containing valid JSON.
{% endwarning %}

```yaml
apiVersion: kuma.io/v1alpha1
kind: ContainerPatch
metadata:
  name: container-patch-1
  namespace: {{site.mesh_namespace}}
spec:
  sidecarPatch:
    - op: add
      path: /securityContext/privileged
      value: "true"
    - op: add
      path: /resources/requests/cpu
      value: '"100m"'
    - op: add
      path: /resources/limits
      value: '{
        "cpu": "500m",
        "memory": "256Mi"
      }'
  initPatch:
    - op: add
      path: /securityContext/seccompProfile
      value: '{
        "type": "RuntimeDefault"
      }'
```

This will change the `securityContext` section of `kuma-sidecar` container from:

```yaml
securityContext:
  runAsGroup: 5678
  runAsUser: 5678
```

to:

```yaml
securityContext:
  runAsGroup: 5678
  runAsUser: 5678
  privileged: true
```

and similarly change the securityContext section of the init container from:

```yaml
securityContext:
  capabilities:
    add:
      - NET_ADMIN
      - NET_RAW
  runAsGroup: 0
  runAsUser: 0
```

to:

```yaml
securityContext:
  capabilities:
    add:
      - NET_ADMIN
      - NET_RAW
  runAsGroup: 0
  runAsNonRoot: true
```

Resources `requests cpu` will be changed from: 

```yaml
requests:
  cpu: 50m
```

to: 

```yaml
requests:
  cpu: 100m
```

Resources `limits` will be changed from: 

```yaml
limits:
  cpu: 1000m
  memory: 512Mi
```

to: 

```yaml
limits:
  cpu: 500m
  memory: 256Mi
```

### Workload matching

A `ContainerPatch` is matched to a `Pod` via an `kuma.io/container-patches`
annotation on the workload. Each annotation may be an ordered list of
`ContainerPatch` names, which will be applied in the order specified.

{% warning %}
If a workload refers to a `ContainerPatch` which does not exist, the injection
will explicitly fail and log the failure.
{% endwarning %}

#### Example

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  namespace: app-ns
  name: app-deployment
spec:
  replicas: 1
  selector:
    matchLabels:
      app: app-deployment
  template:
    metadata:
      labels:
        app: app-deployment
      annotations:
        kuma.io/container-patches: container-patch-1,container-patch-2
    spec: [...]
```

### Default patches 

You can configure `kuma-cp` to apply the list of default patches for workloads
which don't specify their own patches by modifying the `containerPatches` value
from the `kuma-dp` configuration:

```yaml
[...]
runtime:
  kubernetes:
    injector:
      containerPatches: [ ]
[...]
```

{% tip %}
If you specify the list of default patches (i.e. `["default-patch-1", "default-patch-2]`)
but your workload will be annotated with its own list of patches (i.e.
`["pod-patch-1", "pod-patch-2]`) only the latter will be applied. 
{% endtip %}

To install a CP with env vars you can do:

```shell
kumactl install control-plane --env-var "KUMA_RUNTIME_KUBERNETES_INJECTOR_CONTAINER_PATCHES=patch1,patch2"
```

### Error modes and validation

When applying `ContainerPatch` {{site.mesh_product_name}} will validate that the rendered container
spec meets the Kubernetes specification. {{site.mesh_product_name}} **will not** validate that it is
a sane configuration.

If a workload refers to a `ContainerPatch` which does not exist, the injection
will explicitly fail and log the failure.

## Direct access to services

By default, on Kubernetes data plane proxies communicate with each other by leveraging the `ClusterIP` address of the `Service` resources. Also by default, any request made to another service is automatically load balanced client-side by the data plane proxy that originates the request (they are load balanced by the local Envoy proxy sidecar proxy).

There are situations where we may want to bypass the client-side load balancing and directly access services by using their IP address (ie: in the case of Prometheus wanting to scrape metrics from services by their individual IP address).

When an originating service wants to directly consume other services by their IP address, the originating service's `Deployment` resource must include the following annotation:

```yaml
kuma.io/direct-access-services: Service1, Service2, ServiceN
```

Where the value is a comma separated list of {{site.mesh_product_name}} services that will be consumed directly. For example:

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
        kuma.io/direct-access-services: "backend_example_svc_1234,backend_example_svc_1235"
    spec:
      containers:
        ...
```

{% tip %}
**Note**: When using direct access with [headless service](https://kubernetes.io/docs/concepts/services-networking/service/#headless-services), destination service will be accessible at: `{{site.mesh_product_name}}-service.pod-name.mesh`
{% endtip %}

We can also use `*` to indicate direct access to every service in the Mesh:

```yaml
kuma.io/direct-access-services: *
```

{% warning %}
Using `*` to directly access every service is a resource intensive operation, so we must use it carefully.
{% endwarning %}

### Schema

{% json_schema kuma.io_containerpatches type=crd %}
