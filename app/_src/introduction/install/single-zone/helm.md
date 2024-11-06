---
title: Install single-zone on Kubernetes with Helm
content_type: how-to
---

This is a simple guide on how to install {{site.mesh_product_name}} on your Kubernetes cluster using [Helm](https://helm.sh/).

1. Add helm repo:
```shell
helm repo add {{site.mesh_helm_repo_name}} {{site.mesh_helm_repo_url}} && helm repo update
```
2. Install {{site.mesh_product_name}} on your cluster:
```shell
helm install --create-namespace \
  --namespace {{site.mesh_namespace}} \
  {{ site.mesh_helm_install_name }} {{ site.mesh_helm_repo }} --version {{ page.version_data.version }}
```
3. Verify installation:
```shell
kubectl -n {{site.mesh_namespace}} port-forward svc/{{ site.mesh_helm_install_name }}-control-plane 5681:5681
```
Open [GUI](/docs/{{ page.version }}/production/gui) in your browser by navigating to [127.0.0.1:5681/gui](http://127.0.0.1:5681/gui)  

## Next steps
* [Complete quickstart](/docs/{{ page.version }}/quickstart/kubernetes-demo/) to install demo application and secure traffic 
* Read more about [single-zone setup](/docs/{{ page.version }}/production/deployment/single-zone/)
* [Federate](/docs/{{ page.version }}/guides/federate) zone into a multi-zone deployment