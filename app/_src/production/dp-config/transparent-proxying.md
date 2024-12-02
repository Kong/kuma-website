---
title: Configure transparent proxying
content_type: how-to
---

{% comment %}
This page is legacy and shown only for Kuma < 2.9.x. Only fix obvious bugs here; make other changes in app/_src/networking/transparent-proxy/
{% endcomment %}

In order to automatically intercept traffic from and to a service through a `kuma-dp` data plane proxy instance, {{site.mesh_product_name}} utilizes a transparent proxying using [`iptables`](https://linux.die.net/man/8/iptables).

Transparent proxying helps with a smoother rollout of a Service Mesh to a current deployment by preserving existing service naming and as the result - avoid changes to the application code.

## Kubernetes

On **Kubernetes** `kuma-dp` leverages transparent proxying automatically via `iptables` installed with `kuma-init` container or CNI.
All incoming and outgoing traffic is automatically intercepted by `kuma-dp` without having to change the application code.

{{site.mesh_product_name}} integrates with a service naming provided by Kubernetes DNS as well as providing its own [{{site.mesh_product_name}} DNS](/docs/{{ page.release }}/networking/dns) for multi-zone service naming.

## Universal

On **Universal** `kuma-dp` leverages the [data plane proxy specification](/docs/{{ page.release }}/production/dp-config/dpp-on-universal#dataplane-configuration) associated to it for receiving incoming requests on a pre-defined port.

In order to enable transparent-proxy the Zone Control Plane must exist on a seperate server.  Running the Zone Control Plane with Postgres does not function with transparent-proxy on the same machine.

There are several advantages for using transparent proxying in universal mode:

 * Simpler Dataplane resource, as the `outbound` section becomes obsolete and can be skipped.
 * Universal service naming with `.mesh` [DNS domain](/docs/{{ page.release }}/networking/dns) instead of explicit outbound like `https://localhost:10001`.
 * Support for hostnames of your choice using [VirtualOutbounds](/docs/{{ page.release }}/policies/virtual-outbound) that lets you preserve existing service naming.
 * Better service manageability (security, tracing).

### Setting up the service host

Prerequisites:

- `kuma-dp`, `envoy`, and `coredns` must run on the worker node -- that is, the node that runs your service mesh workload.
- `coredns` must be in the PATH so that `kuma-dp` can access it.
  - You can also set the location with the `--dns-coredns-path` flag to `kuma-dp`.

{{site.mesh_product_name}} comes with [`kumactl` executable](/docs/{{ page.release }}/explore/cli) which can help us to prepare the host. Due to the wide variety of Linux setup options, these steps may vary and may need to be adjusted for the specifics of the particular deployment.
The host that will run the `kuma-dp` process in transparent proxying mode needs to be prepared with the following steps executed as `root`:

{% if_version lte:2.4.x %}
1. Use proper version of iptables

   {{site.mesh_product_name}} [isn't yet compatible](https://github.com/kumahq/kuma/issues/8293) with `nf_tables`. You can check the version of iptables with the following command

   ```sh
   iptables --version
   # iptables v1.8.7 (nf_tables)
   ```

   On the recent versions of Ubuntu, you need to change default `iptables`.

   ```sh
   update-alternatives --set iptables /usr/sbin/iptables-legacy
   update-alternatives --set ip6tables /usr/sbin/ip6tables-legacy
   iptables --version
   # iptables v1.8.7 (legacy)
   ```
{% endif_version %}

2. Create a new dedicated user on the machine.

   ```sh
   useradd -u 5678 -U kuma-dp
   ```

3. Redirect all the relevant inbound, outbound and DNS traffic to the {{site.mesh_product_name}} data plane proxy (if you're running any other services on that machine you need to adjust the comma separated lists of `--exclude-inbound-ports` and `--exclude-outbound-ports` accordingly).

   ```sh
   kumactl install transparent-proxy \
     --kuma-dp-user kuma-dp \
     --redirect-dns \
     --exclude-inbound-ports 22
   ```

{% warning %}
Please note that this command **will change** the host's `iptables` rules.

The command excludes port `22`, so you can SSH to the machine without `kuma-dp` running.
{% endwarning %}

The changes won't persist over restarts. You need to either add this command to your start scripts or use firewalld.

### Data plane proxy resource

In transparent proxying mode, the `Dataplane` resource should omit the `networking.outbound` section and use `networking.transparentProxying` section instead.

```yaml
type: Dataplane
mesh: default
name: {% raw %}{{ name }}{% endraw %}
networking:
  address: {% raw %}{{ address }}{% endraw %}
  inbound:
  - port: {% raw %}{{ port }}{% endraw %}
    tags:
      kuma.io/service: demo-client
  transparentProxying:
    redirectPortInbound: 15006
    redirectPortOutbound: 15001
```

The ports illustrated above are the default ones that `kumactl install transparent-proxy` will set. These can be changed using the relevant flags to that command.

### Invoking the {{site.mesh_product_name}} data plane

{% warning %}
It is important that the `kuma-dp` process runs with the same system user that was passed to `kumactl install transparent-proxy --kuma-dp-user`.
The service itself should run with any other user than `kuma-dp`. Otherwise, it won't be able to leverage transparent proxying.
{% endwarning %}

When systemd is used, this can be done with an entry `User=kuma-dp` in the `[Service]` section of the service file.

When starting `kuma-dp` with a script or some other automation instead, we can use `runuser` with the aforementioned yaml resource as follows:

```sh
runuser -u kuma-dp -- \
  /usr/bin/kuma-dp run \
    --cp-address=https://<IP or hostname of CP>:5678 \
    --dataplane-token-file=/kuma/token-demo \
    --dataplane-file=/kuma/dpyaml-demo \
    --dataplane-var name=dp-demo \
    --dataplane-var address=<IP of VM> \
    --dataplane-var port=<Port of the service>  \
    --binary-path /usr/local/bin/envoy
```

You can now reach the service on the same IP and port as before installing transparent proxy, but now the traffic goes through Envoy.
At the same time, you can now connect to services using [{{site.mesh_product_name}} DNS](/docs/{{ page.release }}/networking/dns).

### firewalld support

If you run `firewalld` to manage firewalls and wrap iptables, add the `--store-firewalld` flag to `kumactl install transparent-proxy`. This persists the relevant rules across host restarts. The changes are stored in `/etc/firewalld/direct.xml`. There is no uninstall command for this feature.

### Upgrades

Before upgrading to the next version of {{site.mesh_product_name}}, it's best to clean existing `iptables` rules and only then replace the `kumactl` binary.

You can clean the rules either by restarting the host or by running following commands

{% warning %}
Executing these commands will remove all `iptables` rules, including those created by {{site.mesh_product_name}} and any other applications or services.
{% endwarning %}

```sh
iptables --table nat --flush
iptables --table raw --flush
ip6tables --table nat --flush
ip6tables --table raw --flush
iptables --table nat --delete-chain
iptables --table raw --delete-chain
ip6tables --table nat --delete-chain
ip6tables --table raw --delete-chain
```

In the future release, `kumactl` [will ship](https://github.com/kumahq/kuma/issues/8071) with `uninstall` command.

## Configuration

### Intercepted traffic

{% tabs intercepted-traffic useUrlFragment=false %}
{% tab intercepted-traffic Kubernetes %}

By default, all the traffic is intercepted by Envoy. You can exclude which ports are intercepted by Envoy with the following annotations placed on the Pod

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
        # all incoming connections on ports 1234 won't be intercepted by Envoy
        traffic.kuma.io/exclude-inbound-ports: "1234"
        # all outgoing connections on ports 5678, 8900 won't be intercepted by Envoy
        traffic.kuma.io/exclude-outbound-ports: "5678,8900"
    spec:
      containers:
        ...
```  

You can also control this value on whole {{site.mesh_product_name}} deployment with the following {{site.mesh_product_name}} CP [configuration](/docs/{{ page.release }}/documentation/configuration)

```sh
KUMA_RUNTIME_KUBERNETES_SIDECAR_TRAFFIC_EXCLUDE_INBOUND_PORTS=1234
KUMA_RUNTIME_KUBERNETES_SIDECAR_TRAFFIC_EXCLUDE_OUTBOUND_PORTS=5678,8900
```

{% endtab %}

{% tab intercepted-traffic Universal %}
By default, all ports are intercepted by the transparent proxy. This may prevent remote access to the host via SSH (port `22`) or other management tools when `kuma-dp` is not running.

If you need to access the host directly, even when `kuma-dp` is not running, use the `--exclude-inbound-ports` flag with `kumactl install transparent-proxy` to specify a comma-separated list of ports to exclude from redirection.

Run `kumactl install transparent-proxy --help` for all available options.
{% endtab %}
{% endtabs %}

### Reachable Services

By default, every data plane proxy in the mesh follows every other data plane proxy.
This may lead to performance problems in larger deployments of the mesh.
It is highly recommended to define a list of services that your service connects to.

{% tabs reachable-services useUrlFragment=false %}
{% tab reachable-services Kubernetes %}
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
{% endtab %}
{% tab reachable-services Universal %}
```yaml
type: Dataplane
mesh: default
name: {% raw %}{{ name }}{% endraw %}
networking:
  address: {% raw %}{{ address }}{% endraw %}
  inbound:
  - port: {% raw %}{{ port }}{% endraw %}
    tags:
      kuma.io/service: demo-client
  transparentProxying:
    redirectPortInbound: 15006
    redirectPortOutbound: 15001
    reachableServices:
      - redis_kuma-demo_svc_6379
      - elastic_kuma-demo_svc_9200 
```
{% endtab %}
{% endtabs %}

{% if_version gte:2.9.x %}

### Reachable Backends

{% warning %}
This works only when [MeshService](/docs/{{ page.release }}/networking/meshservice) is enabled.
{% endwarning %}

Reachable Backends provides similar functionality to [reachable services](/docs/{{ page.release }}/production/dp-config/transparent-proxying#reachable-services), but it applies to [MeshService](/docs/{{ page.release }}/networking/meshservice), [MeshExternalService](/docs/{{ page.release }}/networking/meshexternalservice), and [MeshMultiZoneService](/docs/{{ page.release }}/networking/meshmultizoneservice).

By default, every data plane proxy in the mesh tracks every other data plane proxy. Configuring reachableBackends can improve performance and reduce resource utilization.

Unlike reachable services, the model for providing data in Reachable Backends is more structured.

#### Model

- **refs**: A list of all resources your application wants to track and communicate with.
  - **kind**: The type of resource. Possible values include:
    - [**MeshService**](/docs/{{ page.release }}/networking/meshservice)
    - [**MeshExternalService**](/docs/{{ page.release }}/networking/meshexternalservice)
    - **MeshMultiZoneService**
  - **name**: The name of the resource.
  - **namespace**: (Kubernetes only) The namespace where the resource is located. When this is defined, the name is required. Only on kubernetes.
  - **labels**: A list of labels to match on the resources (either `labels` or `name` can be defined).
  - **port**: (Optional) The port of the service you want to communicate with. Works with `MeshService` and `MeshMultiZoneService`

{% tabs reachable-backends-model useUrlFragment=false %}
{% tab reachable-backends-model Kubernetes %}

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
...
spec:
  ...
  template:
    metadata:
        kuma.io/reachable-backends: |
          refs:
          - kind: MeshService
            name: redis
            namespace: kuma-demo
            port: 8080
          - kind: MeshMulitZoneService
            labels:
              kuma.io/display-name: test-server
          - kind: MeshExternalService
            name: mes-http
            namespace: kuma-system
```
{% endtab %}
{% tab reachable-backends-model Universal %}
```yaml
type: Dataplane
mesh: default
name: {% raw %}{{ name }}{% endraw %}
networking:
  ...
  transparentProxying:
    redirectPortInbound: 15006
    redirectPortOutbound: 15001
    reachableBackends:
      refs:
      - kind: MeshService
        name: redis
      - kind: MeshMulitZoneService
        labels:
          kuma.io/display-name: test-server
      - kind: MeshExternalService
        name: mes-http
```
{% endtab %}
{% endtabs %}

#### Examples

##### `demo-app` communicates only with `redis` on port 6379

{% tabs reachable-backends useUrlFragment=false %}
{% tab reachable-backends Kubernetes %}
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: demo-app
  namespace: kuma-demo
spec:
  ...
  template:
    metadata:
      ...
      annotations:
        kuma.io/reachable-backends: |
          refs:
          - kind: MeshService
            name: redis
            namespace: kuma-demo
            port: 6379
    spec:
      containers:
        ...
```
{% endtab %}
{% tab reachable-backends Universal %}
```yaml
type: Dataplane
mesh: default
name: {% raw %}{{ name }}{% endraw %}
networking:
  address: {% raw %}{{ address }}{% endraw %}
  inbound:
  - port: {% raw %}{{ port }}{% endraw %}
    tags:
      kuma.io/service: demo-app
  transparentProxying:
    redirectPortInbound: 15006
    redirectPortOutbound: 15001
    reachableBackends:
      refs:
      - kind: MeshService
        name: redis
        port: 6379
```
{% endtab %}
{% endtabs %}

##### `demo-app` doesn't need to communicate with any service

{% tabs reachable-backends-no-services useUrlFragment=false %}
{% tab reachable-backends-no-services Kubernetes %}
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: demo-app
  namespace: kuma-demo
spec:
  ...
  template:
    metadata:
      ...
      annotations:
        kuma.io/reachable-backends: ""
    spec:
      containers:
        ...
```
{% endtab %}
{% tab reachable-backends-no-services Universal %}
```yaml
type: Dataplane
mesh: default
name: {% raw %}{{ name }}{% endraw %}
networking:
  address: {% raw %}{{ address }}{% endraw %}
  inbound:
  - port: {% raw %}{{ port }}{% endraw %}
    tags:
      kuma.io/service: demo-app
  transparentProxying:
    redirectPortInbound: 15006
    redirectPortOutbound: 15001
    reachableBackends: {}
```
{% endtab %}
{% endtabs %}

##### `demo-app` wants to communicate with all MeshServices in `kuma-demo` namespace

{% tabs reachable-backends-in-namespace useUrlFragment=false %}
{% tab reachable-backends-in-namespace Kubernetes %}
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: demo-app
  namespace: kuma-demo
spec:
  ...
  template:
    metadata:
      ...
      annotations:
        kuma.io/reachable-backends: |
          refs:
          - kind: MeshService
            labels:
              k8s.kuma.io/namespace: kuma-demo
    spec:
      containers:
        ...
```
{% endtab %}
{% endtabs %}

{% endif_version %}
### Transparent Proxy with eBPF (experimental)

Starting from {{site.mesh_product_name}} 2.0 you can set up transparent proxy to use eBPF instead of iptables.

{% warning %}
To use Transparent Proxy with eBPF your environment has to use `Kernel >= 5.7`
and have `cgroup2` available
{% endwarning %}

{% tabs ebpf useUrlFragment=false %}
{% tab ebpf Kubernetes %}

```sh
kumactl install control-plane \
  --set "{{site.set_flag_values_prefix}}experimental.ebpf.enabled=true" | kubectl apply -f-
```

{% endtab %}

{% tab ebpf Universal %}

```sh
kumactl install transparent-proxy \
  --experimental-transparent-proxy-engine \
  --ebpf-enabled \
  --ebpf-instance-ip <IP_ADDRESS> \
  --ebpf-programs-source-path <PATH>
```

{% tip %}
If your environment contains more than one non-loopback network interface, and
you want to specify explicitly which one should be used for transparent proxying
you should provide it using `--ebpf-tc-attach-iface <IFACE_NAME>` flag, during
transparent proxy installation.
{% endtip %}

{% endtab %}
{% endtabs %}
