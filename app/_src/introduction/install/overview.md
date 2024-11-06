---
title: Installation methods overview
---


## Single-zone

{{site.mesh_product_name}}’s default deployment model with one control plane (that can be scaled horizontally) and many 
data planes connecting directly to it.

### Kubernetes

[Install {{site.mesh_product_name}} with helm instruction](/docs/{{ page.version }}/introduction/install/single-zone/helm/) 

[Install {{site.mesh_product_name}} with kumactl instruction](/docs/{{ page.version }}/introduction/install/single-zone/kubernetes-kumactl/)

### Universal

[Install single zone {{site.mesh_product_name}} instruction](/docs/{{ page.version }}/introduction/install/single-zone/universal/)

## Multi-zone

{{site.mesh_product_name}}’s advanced deployment model to support multiple Kubernetes or VM-based zones, or hybrid Service Meshes 
running on both Kubernetes and VMs combined.

### Kubernetes

[Install {{site.mesh_product_name}} with helm instruction](/docs/{{ page.version }}/introduction/install/multi-zone/helm/)

[Install {{site.mesh_product_name}} with kumactl instruction](/docs/{{ page.version }}/introduction/install/multi-zone/kubernetes-kumactl/)


