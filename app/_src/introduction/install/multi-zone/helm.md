---
title: Install multi-zone on Kubernetes with kumactl
content_type: how-to
---

This is a simple guide on how to install {{site.mesh_product_name}} on your Kubernetes clusters using [Helm](https://helm.sh/).

1. Add helm repo:
```shell
helm repo add {{site.mesh_helm_repo_name}} {{site.mesh_helm_repo_url}} && helm repo update
```
2. Install {{site.mesh_product_name}} on global cluster:
```shell
helm install --create-namespace \
  --namespace {{site.mesh_namespace}} \
  --set "controlPlane.mode=global" \
  {{ site.mesh_helm_install_name }} {{ site.mesh_helm_repo }} --version {{ page.version_data.version }}
```
3. Find the external IP and port of the `{{site.mesh_product_name}}-global-zone-sync` service in the {{site.mesh_namespace}} namespace:
```shell
kubectl get service {{site.mesh_product_name}}-global-zone-sync -n {{site.mesh_namespace}} -ojson -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
```
4. Install zone control plane on zone cluster (you need to substitute your `<zone-name>` and `<global-kds-address>` extracted in the previous step):
```shell
helm install --create-namespace --namespace {{site.mesh_namespace}} \
  --set "controlPlane.mode=zone" \
  --set "controlPlane.zone=<zone-name>" \
  --set "ingress.enabled=true" \
  --set "controlPlane.kdsGlobalAddress=grpcs://<global-kds-address>:5685" \
  --set "controlPlane.tls.kdsZoneClient.skipVerify=true" \
  {{ site.mesh_helm_install_name }} {{ site.mesh_helm_repo }} --version {{ page.version_data.version }}
```
5. To verify installation on global Kubernetes cluster run:
```shell
kubectl -n {{site.mesh_namespace}} port-forward svc/{{ site.mesh_helm_install_name }}-control-plane 5681:5681
```
Open [GUI](/docs/{{ page.version }}/production/gui) in your browser by navigating to [127.0.0.1:5681/gui](http://127.0.0.1:5681/gui).
You should see zone connected and healthy.

## Next steps
* Read more about [multi-zone setup](/docs/{{ page.version }}/production/deployment/multi-zone/)