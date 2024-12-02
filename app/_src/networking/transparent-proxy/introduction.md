---
title: Transparent Proxy
content_type: explanation
---

{% assign docs = "/docs/" | append: page.release %}
{% assign Kuma = site.mesh_product_name %}

A transparent proxy is a server that intercepts network traffic going to and from a service without requiring any changes to the application code. In {{ Kuma }}, it captures this traffic and routes it to the [data plane proxy]({{ docs }}/production/dp-config/dpp/#data-plane-proxy), allowing [Mesh policies]({{ docs }}/policies/introduction/#policies) to be applied.

{{ Kuma }} uses [iptables](https://linux.die.net/man/8/iptables) and also has experimental support for [eBPF](#transparent-proxy-with-ebpf-experimental) to make this possible.

{% tip %}
For details on how the transparent proxy works in {{ Kuma }}, see the [Technical Overview]({{ docs }}/networking/transparent-proxy/technical-overview/).
{% endtip %}

## Kubernetes

In [Kubernetes mode]({{ docs }}/introduction/architecture/#kubernetes-mode), the transparent proxy is automatically set up through the `kuma-init` container or [Kuma CNI]({{ docs }}/production/dp-config/cni/). By default, it intercepts all incoming and outgoing traffic and routes it through the `kuma-dp` sidecar container, so no changes to the application code are needed.

{{ Kuma }} works smoothly with [Kubernetes DNS for Services and Pods](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/) and provides its own [Kuma DNS]({{ docs }}/networking/dns/), which is especially helpful in multi-zone setups for cross-zone service discovery.

In this mode, {{ Kuma }} requires the transparent proxy to be enabled, so it **cannot be turned off**.

{% tip %}
For more details on using the transparent proxy with Kubernetes, see [Transparent Proxy on Kubernetes]({{ docs }}/networking/transparent-proxy/kubernetes/).
{% endtip %}

## Universal

Using the transparent proxy in Universal mode makes setup easier and enables features that wouldn’t be possible otherwise. Key benefits include:

- **Simplified `Dataplane` resources**: You can skip the `networking.outbound` section, so you don’t have to list each service your application connects to manually.

- **Simplified service connectivity**: Take advantage of [Kuma DNS]({{ docs }}/networking/dns/) to use `.mesh` domain names, like `https://service-1.mesh`, for easy service connections without needing `localhost` and ports in the `Dataplane` resource.

- **Flexible service addressing**: With [MeshServices]({{ docs }}/networking/meshservice/) and [HostnameGenerators]({{ docs }}/networking/hostnamegenerator/), you can:

  - Keep your existing DNS names when moving to the service mesh.
  - Give a service multiple DNS names for easier access.
  - Set up custom routes, like targeting specific StatefulSet Pods or service versions.
  - Expose a service on multiple ports for different uses.

- **Simpler security, tracing, and observability**: Transparent proxy makes managing these features easier, with no extra setup required.
  For more details related to transparent proxy on Universal refer to [Transparent Proxy on Universal]({{ docs }}/networking/transparent-proxy/universal/)

{% tip %}
For more details on using the transparent proxy with Universal, see [Transparent Proxy on Universal]({{ docs }}/networking/transparent-proxy/universal/).
{% endtip %}

### Transparent proxy with eBPF (experimental)

Starting from {{ Kuma }} 2.0 you can set up transparent proxy to use eBPF instead of iptables.

{% warning %}
To use the transparent proxy with eBPF your environment has to use `Kernel >= 5.7` and have `cgroup2` available
{% endwarning %}

{% tabs ebpf useUrlFragment=false %}
{% tab ebpf Kubernetes %}
```sh
kumactl install control-plane \
  --set "{{ site.set_flag_values_prefix }}experimental.ebpf.enabled=true" \
  | kubectl apply -f-
```
{% endtab %}

{% tab ebpf Universal %}
```sh
kumactl install transparent-proxy \
  --ebpf-enabled \
  --ebpf-instance-ip <IP_ADDRESS> \
  --ebpf-programs-source-path <PATH>
```

{% tip %}
If your environment contains more than one non-loopback network interface, and you want to specify explicitly which one should be used for transparent proxying you should provide it using `--ebpf-tc-attach-iface <IFACE_NAME>` flag, during transparent proxy installation.
{% endtip %}
{% endtab %}
{% endtabs %}
