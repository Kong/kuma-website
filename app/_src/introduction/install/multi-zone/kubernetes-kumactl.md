---
title: Install multi-zone on Kubernetes with kumactl
content_type: how-to
---

This is a simple guide on how to install {{site.mesh_product_name}} on your Kubernetes clusters using `kumactl`.

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
3. Install {{site.mesh_product_name}} on global cluster:
```shell
kumactl install control-plane \
  --set "controlPlane.mode=global" \
  | kubectl apply -f -
```
4. Find the external IP and port of the `{{site.mesh_product_name}}-global-zone-sync` service in the {{site.mesh_namespace}} namespace:
```shell
kubectl get service {{site.mesh_product_name}}-global-zone-sync -n {{site.mesh_namespace}} -ojson -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
```
5. Install zone control plane on zone cluster (you need to substitute your `<zone-name>` and `<global-kds-address>` extracted in the previous step):
```shell
kumactl install control-plane \
  --set "controlPlane.mode=zone" \
  --set "controlPlane.zone=<zone-name>" \
  --set "ingress.enabled=true" \
  --set "controlPlane.kdsGlobalAddress=grpcs://<global-kds-address>:5685" \
  --set "controlPlane.tls.kdsZoneClient.skipVerify=true" \
  | kubectl apply -f -
```
6. To verify installation on global Kubernetes cluster run:
```shell
kubectl -n {{site.mesh_namespace}} port-forward svc/{{ site.mesh_helm_install_name }}-control-plane 5681:5681
```
Open [GUI](/docs/{{ page.version }}/production/gui) in your browser by navigating to [127.0.0.1:5681/gui](http://127.0.0.1:5681/gui).
You should see zone connected and healthy.

## Next steps
* Read more about [multi-zone setup](/docs/{{ page.version }}/production/deployment/multi-zone/)