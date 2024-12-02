---
title: Transparent Proxy on Kubernetes
content_type: how-to
---

{% assign docs = "/docs/" | append: page.release %}
{% assign Kuma = site.mesh_product_name %}
{% assign kuma-system = site.mesh_namespace %}
{% assign controlPlane = site.set_flag_values_prefix | append: "controlPlane" %}
{% assign transparentProxy = site.set_flag_values_prefix | append: "transparentProxy" %}
{% assign kuma-control-plane = site.mesh_cp_name %}
{% assign kuma-control-plane-config = kuma-control-plane | append: "-config" %}

In Kubernetes mode, transparent proxy is automatically set up through the `kuma-init` container or [Kuma CNI]({{ docs }}/production/dp-config/cni/). By default, it intercepts all incoming and outgoing traffic and routes it through the `kuma-dp` sidecar container, so no changes to the application code are needed.

{{ Kuma }} works smoothly with [Kubernetes DNS for Services and Pods](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/) and provides its own [Kuma DNS]({{ docs }}/networking/dns/), which is especially helpful in multi-zone setups for cross-zone service discovery.

In this mode, {{ Kuma }} requires the transparent proxy to be enabled, so it **cannot be turned off**.

## Configuration

The default configuration works well for most scenarios, but there are cases where adjustments are needed.

In Kubernetes mode, {{ Kuma }} offers three methods to adjust the configuration. Each can be used on its own or combined with others if needed.

{% warning %}
It’s best to stick to one method whenever possible. Using more than one can make things more complicated and harder to troubleshoot, as it may not be clear where each setting comes from. If you need to combine methods, check the [**Order of precedence**  section](#order-of-precedence) to see what the final configuration will look like based on the priority of each setting.
{% endwarning %}

### Control plane runtime configuration

The control plane runtime configuration is a section of {{ Kuma }}'s configuration that contains important settings for how the control plane operates, including options for the transparent proxy and other key components.

Some transparent proxy settings can be adjusted here, and **for certain settings, this is the only place they can be modified**.

Currently, it’s best to use the control plane runtime configuration as the main place to store transparent proxy settings that apply to all [workloads](https://kubernetes.io/docs/concepts/workloads/).

{% tip %}
For more details, see the [control plane configuration reference]({{ docs }}/reference/kuma-cp/) under `runtime.kubernetes`. You can also find transparent proxy-specific settings in the [control plane runtime configuration section]({{ docs }}/reference/transparent-proxy-configuration/#control-plane-runtime-configuration) of the Transparent Proxy Configuration reference.
{% endtip %}

#### Settings restricted to control plane runtime configuration

Some transparent proxy settings **can only be changed through the control plane’s runtime configuration** because they are shared with other {{ Kuma }} components. These settings handle essential tasks like creating [`Dataplane` resources]({{ docs }}/production/dp-config/dpp/) for workloads and setting up the [`kuma-dp` sidecar container]({{ docs }}/production/dp-config/dpp-on-kubernetes/) alongside them. For example, the DNS port used to redirect traffic is shared between the transparent proxy and the `kuma-dp run` command in the sidecar container. Keeping these settings consistent across workloads prevents misconfigurations. These settings are:

- `runtime.kubernetes.injector.sidecarContainer.redirectPortInbound`
- `runtime.kubernetes.injector.sidecarContainer.redirectPortOutbound`
- `runtime.kubernetes.injector.sidecarContainer.uid`
- `runtime.kubernetes.injector.builtinDNS.enabled`
- `runtime.kubernetes.injector.builtinDNS.port`

{% danger %}
⚠️ IMPORTANT
{:.custom-block-title}

When the [**Configuration in ConfigMap**](#configuration-in-configmap-experimental) feature is enabled, any changes to these settings, whether through annotations or ConfigMap, will be ignored, and a warning will be logged in the control plane.

**However**, if this feature is disabled, and you update `builtinDNS.enabled` or `builtinDNS.port` using deprecated annotations, the changes may still apply, potentially causing DNS redirection issues. This could prevent `kuma-dp` from starting the DNS server or listening on the correct port, leading to environment disruptions.
{% enddanger %}

#### Modifying control plane runtime configuration

For instructions on modifying the control plane configuration, see the [Modifying the configuration section]({{ docs }}/documentation/configuration/#modifying-the-configuration) in the control plane configuration documentation.

### Configuration in ConfigMap (experimental)

{% warning %}
Because this feature impacts multiple underlying components, it is considered experimental. Use it with caution. {% if site.mesh_product_name == "Kuma" %} If you encounter any unexpected behavior or issues, please [**contact us**](/community) and [**submit an issue on GitHub**](https://github.com/kumahq/kuma/issues/new/choose). Your feedback is essential in helping us improve this feature. {% endif %}
{% endwarning %}

Until {{ Kuma }} 2.9, transparent proxy settings could only be modified through the [control plane runtime configuration](#control-plane-runtime-configuration) and [annotations](#annotations), which had several limitations:

- Not all settings were available through both methods; some could only be adjusted with annotations, while others were limited to the runtime configuration.
- Control plane runtime settings were applied globally to all workloads with injected data planes, making it hard to customize settings for specific groups of workloads.
- Annotation-based settings had to be added to each workload individually, making it difficult to manage the same configuration across multiple workloads.

To address these issues, {{ Kuma }} now supports storing transparent proxy settings in dedicated ConfigMaps. These ConfigMaps can be applied at the namespace or individual workload level, offering greater flexibility and easier configuration.

To enable this feature, set `{{ transparentProxy }}.configMap.enabled` during installation:

{% cpinstall transparent-proxy-config-configmap-enabling %}
{{ transparentProxy }}.configMap.enabled=true
{% endcpinstall %}

{% if_version lte:2.9.x %}
{% warning %}
If you set `{{ transparentProxy }}.configMap.config` to an empty value, it will override `{{ transparentProxy }}.configMap.enabled` and disable the feature, even if `{{ transparentProxy }}.configMap.enabled` is set to `true`.
{% endwarning %}
{% endif_version %}

#### ConfigMap auto-creation and configuration

During installation, {{ Kuma }} will automatically create a ConfigMap in the `{{ kuma-system }}` namespace. The ConfigMap will be named based on the `{{ transparentProxy }}.configMap.name` setting, and its content will come from the YAML configuration defined in `{{ transparentProxy }}.configMap.config`, which holds the transparent proxy settings.

Here is an example of how to modify parts of this configuration during installation:

{% cpinstall transparent-proxy-config-configmap-auto-creation-examples %}
{{ transparentProxy }}.configMap.config.enabled=true
{{ transparentProxy }}.configMap.config.redirect.outbound.excludePortsForIPs=10\.1\.0\.254\,172\.10\.1.254
{{ transparentProxy }}.configMap.config.redirect.verbose=false
{% endcpinstall %}

{% tip %}
{{ Kuma }} uses a single configuration structure for transparent proxy settings across all components. For the full configuration schema, see the [Helm values.yaml reference]({{ docs }}/reference/kuma-cp/#helm-valuesyaml), particularly under the `{{ transparentProxy }}.configMap.config` path. More details on each setting are available in the [Transparent Proxy Configuration reference]({{ docs }}/reference/transparent-proxy-configuration/#full-reference).
{% endtip %}

#### Custom ConfigMap name

The name of the ConfigMap is defined by the `{{ transparentProxy }}.configMap.name` setting. By default, this name is set to `kuma-transparent-proxy-config`.

To apply a custom name for all workloads, you can modify the `{{ transparentProxy }}.configMap.name` setting during installation:

{% cpinstall transparent-proxy-config-configmap-custom-name-globally %}
{{ transparentProxy }}.configMap.name=custom-name
{% endcpinstall %}

To use a different resource for specific workloads, apply the `traffic.kuma.io/transparent-proxy-configmap-name` annotation to those workloads. For example:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: demo-app
  annotations:
    traffic.kuma.io/transparent-proxy-configmap-name: custom-name
...
```

#### ConfigMap lookup order

{{ Kuma }} looks for the ConfigMap as follows:

1. **If annotation is set**: Search the workload's namespace for the ConfigMap specified by `traffic.kuma.io/transparent-proxy-configmap-name`.

2. **If annotation is set but ConfigMap not found**: Search the `{{ kuma-system }}` namespace for the same ConfigMap.

3. **If no annotation or previous steps failed**: Look for the ConfigMap with the default name in the workload's namespace.

4. **If still not found**: Search the `{{ kuma-system }}` namespace for the ConfigMap with the default name.

{% if_version lte:2.9.x %}
{% warning %}
The ConfigMap in the `{{ kuma-system }}` namespace is required for proper operation, so it must be present even if custom ones are used in all individual workload namespaces.
{% endwarning %}
{% endif_version %}

### Annotations

Kubernetes annotations can be applied to individual workloads to modify the transparent proxy configuration. These annotations allow fine-tuning of specific behaviors for a single workload without affecting others.

For the full list of annotations which affect the transparent proxy configuration refer to [Annotations section]({{ docs }}/reference/transparent-proxy-configuration/#annotations) in the transparent proxy configuration reference.

#### Automatically applied annotations

Certain annotations are automatically added to workloads with [injected sidecar containers]({{ docs }}/production/dp-config/dpp-on-kubernetes/#kubernetes-sidecar-containers), regardless of whether they are explicitly defined. These annotations reflect the final values used to configure the transparent proxy. For settings that can be manually specified, these annotations will still be applied, even if not explicitly provided, using values from the [control plane runtime configuration](#control-plane-runtime-configuration).

The automatically applied annotations include:

- `kuma.io/transparent-proxying`
- `kuma.io/sidecar-uid`
- `kuma.io/transparent-proxying-inbound-port`
- `kuma.io/transparent-proxying-outbound-port`
- `kuma.io/builtin-dns`
- `kuma.io/builtin-dns-port`
- `kuma.io/application-probe-proxy-port`
- `kuma.io/transparent-proxying-ebpf`
- `kuma.io/transparent-proxying-ebpf-bpf-fs-path`
- `kuma.io/transparent-proxying-ebpf-cgroup-path`
- `kuma.io/transparent-proxying-ebpf-tc-attach-iface`
- `kuma.io/transparent-proxying-ebpf-instance-ip-env-var-name`
- `kuma.io/transparent-proxying-ebpf-programs-source-path`
- `kuma.io/transparent-proxying-ip-family-mode`
- `traffic.kuma.io/transparent-proxy-config` (only in environments using Kuma CNI)

These annotations ensure that the proper configuration is automatically applied to each workload, aligning with the global and per-workload settings.

### Order of precedence

When using multiple configuration methods, it's important to understand the order in which they are applied to avoid conflicts and ensure the correct settings are used.

1. [Default values]({{ docs }}/reference/transparent-proxy-configuration/#default-values)

2. [Control plane runtime configuration](#control-plane-runtime-configuration)

3. [Configuration in ConfigMap](#configuration-in-configmap-experimental)

4. [Annotations](#annotations)
