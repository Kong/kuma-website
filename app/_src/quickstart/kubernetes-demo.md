---
title: Deploy Kuma on Kubernetes
---

To start learning how {{site.mesh_product_name}} works, you run and secure a simple demo application that consists of two services:

- `demo-app`: a web application that lets you increment a numeric counter. It listens on port 5050
- `kv`: an in-memory http database that lets you increment a numeric counter. It listens on port 5050


{% mermaid %}
---
title: service graph of the demo app
---
flowchart LR
demo-app(demo-app :5050)
kv(kv :5050)
demo-app --> kv
{% endmermaid %}


## Prerequisites
- [Helm](https://helm.sh/) - a package manager for Kubernetes
- [minikube](https://minikube.sigs.k8s.io/docs/) - a tool for running local Kubernetes clusters

## Start Kubernetes cluster

Start a new Kubernetes cluster on your local machine by executing the command below. The -p option creates a new profile named 'mesh-zone'."

```sh
minikube start -p mesh-zone
```

{% tip %}
You can skip this step if you already have a Kubernetes cluster running.
It can be a cluster running locally or in a public cloud like AWS EKS, GCP GKE, etc.
{% endtip %}

## Install {{site.mesh_product_name}}

Install {{site.mesh_product_name}} control plane with Helm by executing:

```sh
helm repo add {{site.mesh_helm_repo_name}} {{site.mesh_helm_repo_url}}
helm repo update
helm install --create-namespace --namespace {{site.mesh_namespace}} {{ site.mesh_helm_install_name }} {{ site.mesh_helm_repo }}
```

## Deploy demo application

1.  Deploy the application
    ```sh
    kubectl apply -f kuma-demo://k8s/000-with-kuma.yaml
    kubectl wait -n kuma-demo --for=condition=ready pod --selector=app=demo-app --timeout=90s
    ```

2.  Port-forward the service to the namespace on port 5000:

    ```sh
    kubectl port-forward svc/demo-app -n kuma-demo 5050:5050
    ```

3.  In a browser, go to [127.0.0.1:5050](http://127.0.0.1:5050) and increment the counter. 

{% tip %}
You can also use the command line `curl -XPOST localhost:5050/api/counter` or play with the demo [in Insomnia](https://insomnia.rest/run/?label=kuma-counter-demo&uri=https%3A%2F%2Fgithub.com%2Fkumahq%2Fkuma-counter-demo%2Fblob%2F{{ site.mesh_demo_version }}%2Fopenapi.yaml).
{% endtip %}


The demo app includes the `kuma.io/sidecar-injection` label enabled on the `kuma-demo` namespace.

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: kuma-demo
  labels:
    kuma.io/sidecar-injection: enabled
```

This means that {{site.mesh_product_name}} [already knows](/docs/{{ page.release }}/production/dp-config/dpp-on-kubernetes/) that it needs to automatically inject a sidecar proxy to every Kubernetes pod in the `kuma-demo` namespace.

## Explore the GUI

You can view the sidecar proxies that are connected to the {{site.mesh_product_name}} control plane.

{{site.mesh_product_name}} ships with a **read-only** [GUI](/docs/{{ page.release }}/production/gui) that you can use to retrieve {{site.mesh_product_name}} resources. By default, the GUI listens on the API port which defaults to `5681`.

To access {{site.mesh_product_name}} we need to first port-forward the API service with:

```sh
kubectl port-forward svc/{{site.mesh_cp_name}} -n {{site.mesh_namespace}} 5681:5681
```

And then navigate to [127.0.0.1:5681/gui](http://127.0.0.1:5681/gui) to see the GUI.

To learn more, read the [documentation about the user interface](/docs/{{ page.release }}/production/gui).

## Introduce zero-trust security


By default, the network is **insecure and not encrypted**. We can change this with {{site.mesh_product_name}} by enabling
the [Mutual TLS](/docs/{{ page.release }}/policies/mutual-tls/) policy to provision a Certificate Authority (CA) that
will automatically assign TLS certificates to our services (more specifically to the injected data plane proxies running
alongside the services).

We can enable Mutual TLS with a `builtin` CA backend by executing:

{% if_version lte:2.8.x %}
```sh
echo "apiVersion: kuma.io/v1alpha1
kind: Mesh
metadata:
  name: default
spec:
  mtls:
    enabledBackend: ca-1
    backends:
    - name: ca-1
      type: builtin" | kubectl apply -f -
```
{% endif_version %}
{% if_version gte:2.9.x %}
```sh
kubectl patch mesh default --type merge --patch "$(curl kuma-demo://kustomize/overlays/001-with-mtls/mesh.yaml)"
```
{% endif_version %}

The traffic is now **encrypted and secure**. {{site.mesh_product_name}} does not define default traffic permissions, which
means that no traffic will flow with mTLS enabled until we define a proper [MeshTrafficPermission](/docs/{{ page.release }}/policies/meshtrafficpermission)
[policy](/docs/{{ page.release }}/introduction/concepts#policy).

For now, the demo application won't work.
You can verify this by clicking the increment button again and seeing the error message in the browser.
We can allow the traffic from the `demo-app` to `kv` by applying the following `MeshTrafficPermission`:

{% if_version lte:2.8.x %}
```sh
echo "apiVersion: kuma.io/v1alpha1
kind: MeshTrafficPermission
metadata:
  namespace: {{site.mesh_namespace}}
  name: kv
spec:
  targetRef:
    kind: MeshSubset
    tags:
      kuma.io/service: kv_kuma-demo_svc_5050
  from:
    - targetRef:
        kind: MeshSubset
        tags:
          kuma.io/service: demo-app_kuma-demo_svc_5050
      default:
        action: Allow" | kubectl apply -f -
```
{% endif_version %}
{% if_version gte:2.9.x %}
```sh
kubectl apply -f kuma-demo://kustomize/overlays/001-with-mtls/mesh-traffic-permission.yaml
```
{% endif_version %}

You can click the increment button, the application should function once again.
However, the traffic to `kv` from any other service than `demo-app` is not allowed.

## Next steps

* Explore the [Features](/features) available to govern and orchestrate your service traffic.
* Add a gateway to access the demo from the outside by following the [builtin gateway guide](/docs/{{ page.release }}/guides/gateway-builtin/).
* Add Kong as gateway to access the demo from the outside by following the [delegated gateway guide](/docs/{{ page.release }}/guides/gateway-delegated/).
* [Federate](/docs/{{ page.release }}/guides/federate) zone into a multizone deployment.
* Learn more about what you can do with the [GUI](/docs/{{ page.release }}/production/gui).
* Explore further installation strategies for [single-zone](/docs/{{ page.release }}/production/cp-deployment/single-zone) and [multi-zone](/docs/{{ page.release }}/production/cp-deployment/multi-zone) environments.
* Read the [full documentation](/docs/{{ page.release }}/) to learn about all the capabilities of {{site.mesh_product_name}}.
{% if site.mesh_product_name == "Kuma" %}* Chat with us at the official [Kuma Slack](/community) for questions or feedback.{% endif %}
