---
title: Install single-zone on Kubernetes with kumactl
content_type: how-to
---

This is a simple guide on how to install {{site.mesh_product_name}} on your Kubernetes cluster using `kumactl`.

1. Go to the [{{site.mesh_product_name}} packages](https://cloudsmith.io/~kong/repos/{{site.mesh_product_name_path}}-binaries-release/packages/?q=version%3A{{ page.version_data.version }})
   page to download and extract the installation archive for your OS, or download and extract the latest release automatically (Linux or macOS):
```shell
curl -L {{site.links.web}}{% if page.edition %}/{{page.edition}}{% endif %}/installer.sh | VERSION={{ page.version_data.version }} sh -
```
2. To finish installation, add {{site.mesh_product_name}} binaries to path:
```shell
export PATH=$(pwd)/{{site.mesh_product_name_path}}-{{ page.version_data.version }}/bin:$PATH
```
This directory contains binaries for `kuma-dp`, `kuma-cp`, `kumactl`, `envoy` and `coredns`
3. Install {{site.mesh_product_name}} on your cluster:
```shell
kumactl install control-plane | kubectl apply -f -
```
4. Verify installation:
```shell
kubectl -n {{site.mesh_namespace}} port-forward svc/{{ site.mesh_helm_install_name }}-control-plane 5681:5681
```
Open [GUI](/docs/{{ page.version }}/production/gui) in your browser by navigating to [127.0.0.1:5681/gui](http://127.0.0.1:5681/gui)

## Next steps
* [Complete quickstart](/docs/{{ page.version }}/quickstart/kubernetes-demo/) to install demo application and secure traffic
* Read more about [single-zone setup](/docs/{{ page.version }}/production/deployment/single-zone/)
* [Federate](/docs/{{ page.version }}/guides/federate) zone into a multi-zone deployment