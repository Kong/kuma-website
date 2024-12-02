---
title: Requirements
---

This page exposes the different requirements to run {{site.mesh_product_name}}.

## Architecture

{{site.mesh_product_name}} supports machines with `x86_64` and `arm64` architecture. 

## Kubernetes

{{site.mesh_product_name}} is validated against two Kubernetes versions:

{% if page.version_data.release != "dev" %}
<iframe frameborder="0" scrolling="no" style="width:100%; height:118px;" allow="clipboard-write" src="https://emgithub.com/iframe.html?target=https%3A%2F%2Fgithub.com%2Fkumahq%2Fkuma%2Fblob%2Frelease-{{page.version_data.release | truncate: 3, ""}}%2Fmk%2Fdev.mk%23L24-L25&style=default&type=code&showFileMeta=on&showFullPath=on"></iframe>
{% endif %}

{% if page.version_data.release == "dev" %}
<iframe frameborder="0" scrolling="no" style="width:100%; height:118px;" allow="clipboard-write" src="https://emgithub.com/iframe.html?target=https%3A%2F%2Fgithub.com%2Fkumahq%2Fkuma%2Fblob%2Fmaster%2Fmk%2Fdev.mk%23L24-L25&style=default&type=code&showFileMeta=on&showFullPath=on"></iframe>
{% endif %}


## Envoy

{{site.mesh_product_name}} {{page.version_data.release}} by default uses [Envoy](https://www.envoyproxy.io/) version:

{% if_version lte:2.6.x %}
<iframe frameborder="0" scrolling="no" style="width:100%; height:97px;" allow="clipboard-write" src="https://emgithub.com/iframe.html?target=https%3A%2F%2Fgithub.com%2Fkumahq%2Fkuma%2Fblob%2Frelease-{{page.version_data.release | truncate: 3, ""}}%2Ftools%2Freleases%2Fversion.sh%23L11&style=default&type=code&showFileMeta=on&showFullPath=on"></iframe>
{% endif_version %}

{% if_version gte:2.7.x %}
{% if page.version_data.release != "dev" %}
<iframe frameborder="0" scrolling="no" style="width:100%; height:97px;" allow="clipboard-write" src="https://emgithub.com/iframe.html?target=https%3A%2F%2Fgithub.com%2Fkumahq%2Fkuma%2Fblob%2Frelease-{{page.version_data.release | truncate: 3, ""}}%2Fmk%2Fdev.mk%23L10&style=default&type=code&showFileMeta=on&showFullPath=on"></iframe>
{% endif %}
{% endif_version %}

{% if page.version_data.release == "dev" %}
<iframe frameborder="0" scrolling="no" style="width:100%; height:97px;" allow="clipboard-write" src="https://emgithub.com/iframe.html?target=https%3A%2F%2Fgithub.com%2Fkumahq%2Fkuma%2Fblob%2Fmaster%2Fmk%2Fdev.mk%23L10&style=default&type=code&showFileMeta=on&showFullPath=on"></iframe>
{% endif %}

{{site.mesh_product_name}} support all patch version of this minor Envoy version. Also, {{site.mesh_product_name}} supports
Envoy versions used in two previous minor version of {{site.mesh_product_name}}.

## Sizing your control-plane

In short, a control-plane with 4vCPU and 2GB of memory will be able to accommodate more than 1000 data planes.

While it's really hard to give a precise number, a good rule of thumb is to assign about 1MB of memory per data plane.
When it comes to CPUs {{site.mesh_product_name}} handles parallelism extremely well (its architecture uses a lot of shared nothing go-routines) so more CPUs usually enable quicker propagation of changes.

That being said we highly recommend you to run your own load tests prior to going to production.
There are many ways to run workloads and deploy applications and while we test some of them, you are in the best place to build a realistic benchmark of what you do.

To see if you may need to increase your control-plane's spec, there are two main metrics to pay attention to:

- propagation time (xds_delivery): this is the time it takes between a change in the mesh and the dataplane receiving its updated configuration. Think about it as the "reactivity of your mesh".
- configuration generation time (xds_generation): this is the time it takes for the configuration to be generated.

For any large mesh using transparent-proxy it's highly recommended to use [reachable services](/docs/{{ page.release }}/{% if_version lte:2.8.x %}production/dp-config/transparent-proxying/#{% endif_version %}{% if_version gte:2.9.x %}networking/transparent-proxy/{% endif_version %}reachable-services).

You can also find tuning configuration in the [fine-tuning](/docs/{{ page.release }}/production/upgrades-tuning/fine-tuning/) section of the docs.

## Sizing your sidecar container on Kubernetes

When deploying {{site.mesh_product_name}} on Kubernetes, the sidecar is deployed as a separate container, `kuma-sidecar`, in your `Pods`. By default it has the following resource requests and limits:

```yaml
resources:
    requests:
        cpu: 50m
        memory: 64Mi
    limits:
        cpu: 1000m
        memory: 512Mi
```

This configuration should be enough for most use cases. In some cases, like when you cannot scale horizontally or your service handles lots of concurrent traffic, you may need to change these values. You can do this using the [`ContainerPatch` resource](/docs/{{ page.release }}/production/dp-config/dpp-on-kubernetes/#custom-container-configuration). 

For example, you can modify individual parameters under `resources`:

```yaml
apiVersion: kuma.io/v1alpha1
kind: ContainerPatch
metadata:
  name: container-patch-1
  namespace: {{site.mesh_namespace}}
spec:
  sidecarPatch:
    - op: add
      path: /resources/requests/cpu
      value: '"1"'
```

you could modify the entire `limits`, `request` or `resources` sections:

```yaml
apiVersion: kuma.io/v1alpha1
kind: ContainerPatch
metadata:
  name: container-patch-1
  namespace: {{site.mesh_namespace}}
spec:
  sidecarPatch:
    - op: add
      path: /resources/limits
      value: '{
        "cpu": "1",
        "memory": "1G"
      }'
```

Check [the `ContainerPatch` documentation](/docs/{{ page.release }}/production/dp-config/dpp-on-kubernetes/#workload-matching) for how to apply these resources to specific `Pods`.

{% tip %}
**Note**: When changing these resources, remember that they must be described using [Kubernetes resource units](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/#resource-units-in-kubernetes)
{% endtip %} 
