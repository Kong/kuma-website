---
title: Deploy a multi-zone global control plane
content_type: how-to
---

## Prerequisites

To set up a multi-zone deployment we will need to:

- [Set up the global control plane](#set-up-the-global-control-plane)
- [Set up the zone control planes](#set-up-the-zone-control-planes)
- [Verify control plane connectivity](#verify-control-plane-connectivity)
- [Ensure mTLS is enabled for the multi-zone meshes](#ensure-mtls-is-enabled-on-the-multi-zone-meshes)

## Usage
### Set up the global control plane


The global control plane must run on a dedicated cluster (unless using "Universal on Kubernetes" mode), and cannot be assigned to a zone.


{% tabs global-control-plane useUrlFragment=false %}
{% tab global-control-plane Kubernetes %}

The global control plane on Kubernetes must reside on its own Kubernetes cluster, to keep its resources separate from the resources the zone control planes create during synchronization.

Run:

    {% cpinstall gcp %}
    controlPlane.mode=global
    {% endcpinstall %}

Find the external IP and port of the `{{site.mesh_cp_zone_sync_name_prefix}}global-zone-sync` service in the `{{site.mesh_namespace}}` namespace:

```sh
kubectl get services -n {{site.mesh_namespace}}
```

```
NAMESPACE     NAME                   TYPE           CLUSTER-IP      EXTERNAL-IP      PORT(S)                                                                  AGE
{{site.mesh_namespace}}   {{site.mesh_cp_zone_sync_name_prefix}}global-zone-sync     LoadBalancer   10.105.9.10     35.226.196.103   5685:30685/TCP                                                           89s
{{site.mesh_namespace}}   {{site.mesh_cp_name}}     ClusterIP      10.105.12.133   <none>           5681/TCP,443/TCP,5676/TCP,5677/TCP,5678/TCP,5679/TCP,5682/TCP,5653/UDP   90s
```

By default, it's exposed on [port 5685](/docs/{{ page.release }}/production/use-mesh#control-plane-ports). In this example the value is `35.226.196.103:5685`. You pass this as the value of `<global-kds-address>` when you set up the zone control planes.

{% endtab %}


{% tab global-control-plane Universal on Kubernetes using Helm %}

{% tip %}

Running global control plane in "Universal on Kubernetes" mode means using PostgreSQL as storage instead of Kubernetes.
It means that failover / HA / reliability characteristics will change.
Please read [Kubernetes](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/ha-topology/) and
[PostgreSQL](https://www.postgresql.org/docs/current/high-availability.html) docs for more details.

{% endtip %}

Before using {{site.mesh_product_name}} with helm, please follow [these steps](/docs/{{ page.release }}/production/cp-deployment/kubernetes/#helm) to configure your local helm repo and learn the reference helm configuration `values.yaml`.

1. Define Kubernetes secrets with database sensitive information

   ```yaml
   apiVersion: v1
   kind: Secret
   metadata:
     name: your-secret-name
   type: Opaque
   data:
     POSTGRES_DB: ...
     POSTGRES_HOST_RW: ...
     POSTGRES_USER: ...
     POSTGRES_PASSWORD: ...
   ```

2. Create a `values.yaml` file with: `{{site.set_flag_values_prefix}}controlPlane.environment=universal` and `{{site.set_flag_values_prefix}}controlPlane.mode=global` in the chart (`values.yaml`).

3. Set `{{site.set_flag_values_prefix}}controlPlane.secrets` with database sensitive information

   ```yaml
   # ...
       secrets:
         postgresDb:
           Secret: your-secret-name
           Key: POSTGRES_DB
           Env: KUMA_STORE_POSTGRES_DB_NAME
         postgresHost:
           Secret: your-secret-name
           Key: POSTGRES_HOST_RW
           Env: KUMA_STORE_POSTGRES_HOST
         postgrestUser:
           Secret: your-secret-name
           Key: POSTGRES_USER
           Env: KUMA_STORE_POSTGRES_USER
         postgresPassword:
           Secret: your-secret-name
           Key: POSTGRES_PASSWORD
           Env: KUMA_STORE_POSTGRES_PASSWORD
   ```

4. Optionally set `{{site.set_flag_values_prefix}}postgres` with TLS settings

   ```yaml
   # ...
     # Postgres' settings for universal control plane on k8s
     postgres:
       # -- Postgres port, password should be provided as a secret reference in "controlPlane.secrets"
       # with the Env value "KUMA_STORE_POSTGRES_PASSWORD".
       # Example:
       # controlPlane:
       #   secrets:
       #     - Secret: postgres-postgresql
       #       Key: postgresql-password
       #       Env: KUMA_STORE_POSTGRES_PASSWORD
       port: "5432"
       # TLS settings
       tls:
         # -- Mode of TLS connection. Available values are: "disable", "verifyNone", "verifyCa", "verifyFull"
         mode: disable # ENV: KUMA_STORE_POSTGRES_TLS_MODE
         # -- Whether to disable SNI the postgres `sslsni` option.
         disableSSLSNI: false # ENV: KUMA_STORE_POSTGRES_TLS_DISABLE_SSLSNI
         # -- Secret name that contains the ca.crt
         caSecretName:
         # -- Secret name that contains the client tls.crt, tls.key
         secretName:
   ```

5. Run helm install

    ```sh
    helm install {{ site.mesh_helm_install_name }} \
      --create-namespace \
      --skip-crds \
      --namespace {{site.mesh_namespace}} \
      --values values.yaml \
      {{ site.mesh_helm_repo }}
    ```

6. Find the external IP and port of the `{{site.mesh_cp_zone_sync_name_prefix}}global-zone-sync` service in the `{{site.mesh_namespace}}` namespace:

    ```sh
    kubectl get services -n {{site.mesh_namespace}}
    ```

    ```
    NAMESPACE     NAME                   TYPE           CLUSTER-IP      EXTERNAL-IP      PORT(S)                                                                  AGE
    {{site.mesh_namespace}}   {{site.mesh_cp_zone_sync_name_prefix}}global-zone-sync     LoadBalancer   10.105.9.10     35.226.196.103   5685:30685/TCP                                                           89s
    {{site.mesh_namespace}}   {{site.mesh_cp_name}}     ClusterIP      10.105.12.133   <none>           5681/TCP,443/TCP,5676/TCP,5677/TCP,5678/TCP,5679/TCP,5682/TCP,5653/UDP   90s
    ```

    In this example the value is `35.226.196.103:5685`. You pass this as the value of `<global-kds-address>` when you set up the zone control planes.

{% endtab %}
{% tab global-control-plane Universal %}

{% tip %}
When running the global control plane in Universal mode, a database must be used to persist state for production deployments.
Ensure that migrations have been run against the database prior to running the global control plane.
{% endtip %}

1.  Set up the global control plane, and add the `global` environment variable:

    ```sh
    KUMA_MODE=global \
    KUMA_ENVIRONMENT=universal \
    KUMA_STORE_TYPE=postgres \
    KUMA_STORE_POSTGRES_HOST=<postgres-host> \
    KUMA_STORE_POSTGRES_PORT=<postgres-port> \
    KUMA_STORE_POSTGRES_USER=<postgres-user> \
    KUMA_STORE_POSTGRES_PASSWORD=<postgres-password> \
    KUMA_STORE_POSTGRES_DB_NAME=<postgres-db-name> \
    kuma-cp run
    ```

{% endtab %}
{% endtabs %}

### Set up the zone control planes

You need the following values to pass to each zone control plane setup:

- `zone` -- the zone name. An arbitrary string. This value registers the zone control plane with the global control plane.
- `kds-global-address` -- the external IP and port of the global control plane.

{% tabs zone-control-planes useUrlFragment=false %}
{% tab zone-control-planes Kubernetes %}

On each zone control plane, run:

{% if_version gte:2.3.x %}
{% cpinstall zcp %}
controlPlane.mode=zone
controlPlane.zone=<zone-name>
ingress.enabled=true
controlPlane.kdsGlobalAddress=grpcs://<global-kds-address>:5685
controlPlane.tls.kdsZoneClient.skipVerify=true
{% endcpinstall %}
{% endif_version %}
{% if_version lte:2.2.x %}
{% cpinstall zcp-old %}
controlPlane.mode=zone
controlPlane.zone=<zone-name>
ingress.enabled=true
controlPlane.kdsGlobalAddress=grpcs://<global-kds-address>:5685
{% endcpinstall %}
{% endif_version %}

where `{{site.set_flag_values_prefix}}controlPlane.zone` is the same value for all zone control planes in the same zone.

Add `--set {{site.set_flag_values_prefix}}egress.enabled=true` to list of arguments if you want to deploy optional [Zone Egress](/docs/{{ page.release }}/production/cp-deployment/zoneegress/).

{% if_version gte:2.3.x %}
Set `--set {{site.set_flag_values_prefix}}controlPlane.tls.kdsZoneClient.skipVerify=true` because the default global control plane's certificate is self-signed.
For production use a certificate signed by a trusted CA. See [Secure access across services](/docs/{{ page.release }}/production/secure-deployment/certificates/) page for more information.
{% endif_version %}

{% endtab %}
{% tab zone-control-planes Universal %}

{% tip %}
When running the zone control plane in Universal mode, a database must be used to persist state for production deployments.
Ensure that migrations have been run against the database prior to running the zone control plane.
{% endtip %}

1. On each zone control plane, run:

   {% if_version gte:2.3.x %}
   ```sh
    KUMA_MODE=zone \
    KUMA_MULTIZONE_ZONE_NAME=<zone-name> \
    KUMA_ENVIRONMENT=universal \
    KUMA_STORE_TYPE=postgres \
    KUMA_STORE_POSTGRES_HOST=<postgres-host> \
    KUMA_STORE_POSTGRES_PORT=<postgres-port> \
    KUMA_STORE_POSTGRES_USER=<postgres-user> \
    KUMA_STORE_POSTGRES_PASSWORD=<postgres-password> \
    KUMA_STORE_POSTGRES_DB_NAME=<postgres-db-name> \
    KUMA_MULTIZONE_ZONE_GLOBAL_ADDRESS=grpcs://<global-kds-address>:5685 \
    kuma-cp run
   ```
   {% endif_version %}
   {% if_version lte:2.2.x %}
   ```sh
    KUMA_MODE=zone \
    KUMA_MULTIZONE_ZONE_NAME=<zone-name> \
    KUMA_ENVIRONMENT=universal \
    KUMA_STORE_TYPE=postgres \
    KUMA_STORE_POSTGRES_HOST=<postgres-host> \
    KUMA_STORE_POSTGRES_PORT=<postgres-port> \
    KUMA_STORE_POSTGRES_USER=<postgres-user> \
    KUMA_STORE_POSTGRES_PASSWORD=<postgres-password> \
    KUMA_STORE_POSTGRES_DB_NAME=<postgres-db-name> \
    KUMA_MULTIZONE_ZONE_GLOBAL_ADDRESS=grpcs://<global-kds-address>:5685 \
    kuma-cp run
   ```
   {% endif_version %}

   where `KUMA_MULTIZONE_ZONE_NAME` is the same value for all zone control planes in the same zone.

   {% if_version gte:2.3.x %}
   `KUMA_MULTIZONE_ZONE_KDS_TLS_SKIP_VERIFY` is required because the default global control plane's certificate is self-signed.
   It's recommended to use a certificate signed by a trusted CA in production. See [Secure access across services](/docs/{{ page.release }}/production/secure-deployment/certificates/) page for more information.
   {% endif_version %}

2. Generate the zone proxy token:

   To register the zone ingress and zone egress with the zone control plane, we need to generate a token first

   ```sh
   kumactl generate zone-token --zone=<zone-name> --scope egress --scope ingress > /tmp/zone-token
   ```

   You can also generate the token [with the REST API](/docs/{{ page.release }}/production/cp-deployment/zoneproxy-auth/).
   Alternatively, you could generate separate tokens for ingress and egress.

3. Create an `ingress` data plane proxy configuration to allow `kuma-cp` services to be exposed for cross-zone communication:

   ```sh
   echo "type: ZoneIngress
   name: ingress-01
   networking:
     address: 127.0.0.1 # address that is routable within the zone
     port: 10000
     advertisedAddress: 10.0.0.1 # an address which other zones can use to consume this zone-ingress
     advertisedPort: 10000 # a port which other zones can use to consume this zone-ingress" > ingress-dp.yaml
   ```

4. Apply the ingress config, passing the IP address of the zone control plane to `cp-address`:

   ```sh
   kuma-dp run \
     --proxy-type=ingress \
     --cp-address=https://<kuma-cp-address>:5678 \
     --dataplane-token-file=/tmp/zone-token \
     --dataplane-file=ingress-dp.yaml
   ```

   If zone-ingress is running on a different machine than zone-cp you need to
   copy CA cert file from zone-cp (located in `~/.kuma/kuma-cp.crt`) to somewhere accessible by zone-ingress (e.g. `/tmp/kuma-cp.crt`).
   Modify the above command and provide the certificate path in `--ca-cert-file` argument.

   ```sh
   kuma-dp run \
     --proxy-type=ingress \
     --cp-address=https://<kuma-cp-address>:5678 \
     --dataplane-token-file=/tmp/zone-token \
     --ca-cert-file=/tmp/kuma-cp.crt \
     --dataplane-file=ingress-dp.yaml
   ```

5.  Optional: if you want to deploy zone egress

    Create a `ZoneEgress` data plane proxy configuration to allow `kuma-cp` services
    to be configured to proxy traffic to other zones or external services through
    zone egress:

    ```sh
    echo "type: ZoneEgress
    name: zoneegress-01
    networking:
      address: 127.0.0.1 # address that is routable within the zone
      port: 10002" > zoneegress-dataplane.yaml
    ```

6. Apply the egress config, passing the IP address of the zone control plane to `cp-address`:

    ```sh
    kuma-dp run \
      --proxy-type=egress \
      --cp-address=https://<kuma-cp-address>:5678 \
      --dataplane-token-file=/tmp/zone-token \
      --dataplane-file=zoneegress-dataplane.yaml
    ```

{% endtab %}
{% endtabs %}

### Verify control plane connectivity

If your global control plane runs on Kubernetes, you'll need to configure your `kumactl` like so:

```sh
# forward traffic from local pc into global control plane in the cluster
kubectl -n {{site.mesh_namespace}} port-forward svc/{{site.mesh_cp_name}} 5681:5681 &

# configure control plane for kumactl
kumactl config control-planes add \
  --name global-control-plane \
  --address http://localhost:5681 \
  --skip-verify
```

You can run `kumactl get zones`, or check the list of zones in the web UI for the global control plane, to verify zone control plane connections.

When a zone control plane connects to the global control plane, the `Zone` resource is created automatically in the global control plane.

The Zone Ingress tab of the web UI also lists zone control planes that you
deployed with zone ingress.

### Ensure mTLS is enabled on the multi-zone meshes

mTLS is mandatory to enable cross-zone service communication.
mTLS can be configured in your mesh configuration as indicated in the [mTLS section](/docs/{{ page.release }}/policies/mutual-tls).
This is required because {{site.mesh_product_name}} uses the [Server Name Indication](https://en.wikipedia.org/wiki/Server_Name_Indication) field, part of the TLS protocol, as a way to pass routing information cross zones.

### Cross-zone communication details

For this example we will assume we have a service running in a Kubernetes zone exposing a `kuma.io/service` with value `echo-server_echo-example_svc_1010`.
The following examples are running in the remote zone trying to access the previously mentioned service.

{% tabs cross-zone-communication-details useUrlFragment=false %}
{% tab cross-zone-communication-details Kubernetes %}

To view the list of service names available, run:

```sh
kubectl get serviceinsight all-services-default -oyaml
```

```
apiVersion: kuma.io/v1alpha1
kind: ServiceInsight
mesh: default
metadata:
  name: all-services-default
spec:
  services:
    echo-server_echo-example_svc_1010:
      dataplanes:
        online: 1
        total: 1
      issuedBackends:
        ca-1: 1
      status: online
```

The following are some examples of different ways to address `echo-server` in the
`echo-example` `Namespace` in a multi-zone mesh.

To send a request in the same zone, you can rely on Kubernetes DNS and use the usual Kubernetes hostnames and ports:

```sh
curl http://echo-server:1010
```

Requests are distributed round-robin between zones.
You can use {% if_version lte:2.5.x %}[locality-aware load balancing](/docs/{{ page.release }}/policies/locality-aware){% endif_version %}{% if_version gte:2.6.x %}[locality-aware load balancing](/docs/{{ page.release }}/policies/meshloadbalancingstrategy){% endif_version %} to keep requests in the same zone.

To send a request to any zone, you can [use the generated `kuma.io/service`](/docs/{{ page.release }}/production/dp-config/dpp-on-kubernetes/#tag-generation) and [{{site.mesh_product_name}} DNS](/docs/{{ page.release }}/networking/dns):

```sh
curl http://echo-server_echo-example_svc_1010.mesh:80
```

{{site.mesh_product_name}} DNS also supports [RFC 1123](https://datatracker.ietf.org/doc/html/rfc1123) compatible names, where underscores are replaced with dots:

```sh
curl http://echo-server.echo-example.svc.1010.mesh:80
```

{% endtab %}
{% tab cross-zone-communication-details Universal %}

```sh
kumactl inspect services
```

```
SERVICE                                  STATUS               DATAPLANES
echo-service_echo-example_svc_1010       Online               1/1
```

To consume the service in a Universal deployment without transparent proxy add the following outbound to your [dataplane configuration](/docs/{{ page.release }}/production/dp-config/dpp-on-universal/):

```yaml
outbound:
  - port: 20012
    tags:
      kuma.io/service: echo-server_echo-example_svc_1010
```

From the data plane running you will now be able to reach the service using `localhost:20012`.

Alternatively, if you configure [transparent proxy](/docs/{{ page.release }}/{% if_version lte:2.8.x %}production/dp-config/transparent-proxying/{% endif_version %}{% if_version gte:2.9.x %}networking/transparent-proxy/introduction/{% endif_version %}) you can just call `echo-server_echo-example_svc_1010.mesh` without defining an `outbound` section.

{% endtab %}
{% endtabs %}

{% tip %}
For security reasons it's not possible to customize the `kuma.io/service` in Kubernetes.

If you want to have the same service running on both Universal and Kubernetes make sure to align the Universal's data plane inbound to have the same `kuma.io/service` as the one in Kubernetes or leverage {% if_version lte:2.5.x %}[TrafficRoute](/docs/{{ page.release }}/policies/traffic-route){% endif_version %}{% if_version gte:2.6.x %}[MeshHTTPRoute](/docs/{{ page.release }}/policies/meshhttproute) and [MeshTCPRoute](/docs/{{ page.release }}/policies/meshtcproute){% endif_version %}.
{% endtip %}

## Delete a zone

To delete a `Zone` we must first shut down the corresponding {{site.mesh_product_name}} zone control plane instances. As long as the Zone CP is running this will not be possible, and {{site.mesh_product_name}} returns a validation error like:

```
zone: unable to delete Zone, Zone CP is still connected, please shut it down first
```

When the Zone CP is fully disconnected and shut down, then the `Zone` can be deleted. All corresponding resources (like `Dataplane` and `DataplaneInsight`) will be deleted automatically as well.

{% tabs delete-zone useUrlFragment=false %}
{% tab delete-zone Kubernetes %}

```sh
kubectl delete zone zone-1
```

{% endtab %}
{% tab delete-zone Universal %}

```sh
kumactl delete zone zone-1
```

{% endtab %}
{% endtabs %}

## Disable a zone

Change the `enabled` property value to `false` in the global control plane:

{% tabs disable-zone useUrlFragment=false %}
{% tab disable-zone Kubernetes %}

```yaml
apiVersion: kuma.io/v1alpha1
kind: Zone
metadata:
  name: zone-1
spec:
  enabled: false
```

{% endtab %}
{% tab disable-zone Universal %}

```yaml
type: Zone
name: zone-1
spec:
  enabled: false
```

{% endtab %}
{% endtabs %}

With this setting, the global control plane will stop exchanging configuration with this zone.
As a result, the zone's ingress from zone-1 will be deleted from other zone and traffic won't be routed to it anymore.
The zone will show as **Offline** in the GUI and CLI.

[zoneegress]: https://kuma.io/docs/latest/security/zoneproxy-auth/
