---
title: Multi-zone deployment
content_type: explanation
---

## About

{{site.mesh_product_name}} supports running your service mesh in multiple zones. It is even possible to run with a mix of Kubernetes and Universal zones. Your mesh environment can include multiple isolated service meshes (multi-tenancy), and workloads running in different regions, on different clouds, or in different datacenters. A zone can be a Kubernetes cluster, a VPC, or any other deployment you need to include in the same distributed mesh environment.
The only condition is that all the data planes running within the zone must be able to connect to the other data planes in this same zone.

<center>
<img src="/assets/images/diagrams/gslides/kuma_multizone.svg" alt="Kuma service mesh multi zone deployment without zone egress" style="padding-top: 20px; padding-bottom: 10px;"/>
</center>
Or without the optional zone egress:
<center>
<img src="/assets/images/diagrams/gslides/kuma_multizone_without_egress.svg" alt="Kuma service mesh multi zone deployment with zone egress" style="padding-top: 20px; padding-bottom: 10px;"/>
</center>

To Install with this topology follow the [multi-zone deployment docs](/docs/{{ page.release }}/production/cp-deployment/multi-zone).

## How it works

In {{site.mesh_product_name}}, zones are abstracted away, meaning that your data plane proxies will find services wherever they run.
This way you can make a service multi-zone by having data planes using the same `kuma.io/service` in different zones. This gives you automatic fail-over of services in case a specific zone fails.

Let's look at how a service `backend` in `zone-b` is advertised to `zone-a` and a request from the local zone `zone-a` is routed to the remote
service in `zone-b`.

### Destination service zone

When the new service `backend` joins the mesh in `zone-b`, the `zone-b` zone control plane adds this service to the `availableServices` on the `zone-b` `ZoneIngress` resource.
The `kuma-dp` proxy running as a zone ingress is configured with this list of
services so that it can route incoming requests.
This `ZoneIngress` resource is then also synchronized to the global control plane.

The global control-plane will propagate the zone ingress resources and all policies to all other zones over {{site.mesh_product_name}} Discovery Service (KDS), which is a protocol based on xDS.

### Source service zone

The `zone-b` `ZoneIngress` resource is synchronized from the global control
plane to the `zone-a` zone control plane.
Requests to the `availableServices` from `zone-a` are load balanced between local instances and remote instances of this service.
Requests send to `zone-b` are routed to the zone ingress proxy of `zone-b`.

For load-balancing, the zone ingress endpoints are weighted with the number of instances running behind them. So a zone with 2 instances will receive twice as much traffic than a zone with 1 instance.
You can also favor local service instances with {% if_version lte:2.5.x %}[locality-aware load balancing](/docs/{{ page.release }}/policies/locality-aware){% endif_version %}{% if_version gte:2.6.x %}[locality-aware load balancing](/docs/{{ page.release }}/policies/meshloadbalancingstrategy){% endif_version %}.

In the presence of a [zone egress](/docs/{{ page.release }}/production/cp-deployment/zoneegress/), the traffic is routed through the local zone egress before being sent to the remote zone ingress.

When using [transparent proxy](/docs/{{ page.release }}/{% if_version lte:2.8.x %}production/dp-config/transparent-proxying/{% endif_version %}{% if_version gte:2.9.x %}networking/transparent-proxy/introduction/{% endif_version %}) (default in Kubernetes),
{{site.mesh_product_name}} generates a VIP,
a DNS entry with the format `<kuma.io/service>.mesh`, and will listen for traffic on port 80. The `<kuma.io/service>.mesh:80` format is just a convention.
[`VirtualOutbounds`](/docs/{{ page.release }}/policies/virtual-outbound)s enable you to customize the listening port and how the DNS name for these services looks.

{% tip %}
A zone ingress is not an API gateway. It is only used for cross-zone communication within a mesh. API gateways are supported in {{site.mesh_product_name}} {% if_version gte:2.6.x %}[gateway mode](/docs/{{ page.release }}/using-mesh/managing-ingress-traffic/overview){% endif_version %}{% if_version lte:2.5.x %}[gateway mode](/docs/{{ page.release }}/explore/gateway){% endif_version %} and can be deployed in addition to zone ingresses.
{% endtip %}

## Components of a multi-zone deployment

A multi-zone deployment includes:

- The **global control plane**:
  - Accept connections only from zone control planes.
  - Accept creation and changes to [policies](/policies) that will be applied to the data plane proxies.
  - Send policies down to zone control planes.
  - Send zone ingresses down to zone control plane.
  - Keep an inventory of all data plane proxies running in all zones (this is only done for observability but is not required for operations).
  - Reject connections from data plane proxies.
- The **zone control planes**:
  - Accept connections from data plane proxies started within this zone.
  - Receive policy updates from the global control plane.
  - Send data plane proxies and zone ingress changes to the global control plane.
  - Compute and send configurations using XDS to the local data plane proxies.
  - Update list of services which exist in the zone in the zone ingress.
  - Reject policy changes that do not come from global.
- The **data plane proxies**:
  - Connect to the local zone control plane.
  - Receive configurations using XDS from the local zone control plane.
  - Connect to other local data plane proxies.
  - Connect to zone ingresses for sending cross zone traffic.
  - Receive traffic from local data plane proxies and local zone ingresses.
- The **zone ingress**:
  - Receive XDS configuration from the local zone control plane.
  - Proxy traffic from other zone data plane proxies to local data plane proxies.
- (optional) The **zone egress**:
  - Receive XDS configuration from the local zone control plane.
  - Proxy traffic from local data plane proxies:
    - to zone ingress proxies from other zones;
    - to external services from local zone;

## Failure modes

### Global control plane offline

- Policy updates will be impossible
- Change in service list between zones will not propagate:
  - New services will not be discoverable in other zones.
  - Services removed from a zone will still appear available in other zones.
- You won't be able to disable or delete a zone.

{% tip %}
Note that both local and cross-zone application traffic is not impacted by this failure case.
Data plane proxy changes will be propagated within their zones.
{% endtip %}

### Zone control plane offline

- New data plane proxies won't be able to join the mesh. This includes new instances (Pod/VM) that are newly created by automatic deployment mechanisms (for example, a rolling update process), meaning a control plane connection failure could block updates of applications and events that create new instances.
- On mTLS enabled meshes, a data plane proxy may fail to refresh its client certificate prior to expiry (defaults to 24 hours), thus causing traffic from/to this data plane to fail.
- Data plane proxy configuration will not be updated.
- Communication between data plane proxies will still work.
- Cross zone communication will still work.
- Other zones are unaffected.

{% tip %}
You can think of this failure case as _"Freezing"_ the zone mesh configuration.
Communication will still work but changes will not be reflected on existing data plane proxies.
{% endtip %}

### Communication between Global and Zone control plane failing

This can happen with misconfiguration or network connectivity issues between control planes.

- Operations inside the zone will happen correctly (data plane proxies can join, leave and all configuration will be updated and sent correctly).
- Policy changes will not be propagated to the zone control plane.
- `ZoneIngress`, `ZoneEgress` and `Dataplane` changes will not be propagated to the global control plane:
  - The global inventory view of the data plane proxies will be outdated (this only impacts observability).
  - Other zones will not see new services registered inside this zone.
  - Other zones will not see services no longer running inside this zone.
  - Other zones will not see changes in number of instances of each service running in the local zone.
- Global control plane will not send changes from other zone ingress to the zone:
  - Local data plane proxies will not see new services registered in other zones.
  - Local data plane proxies will not see services no longer running in other zones.
  - Local data plane proxies will not see changes in number of instances of each service running in other zones.
- Global control plane will not send changes from other zone ingress to the zone.

{% tip %}
Note that both local and cross-zone application traffic is not impacted by this failure case.
{% endtip %}

### Communication between 2 zones failing

This can happen if there are network connectivity issues:

- Between control plane and zone ingress from other zone.
- Between control plane and zone egress (when present).
- Between zone egress (when present) and zone ingress from other zone.
- All Zone egress instances of a zone (when present) are down.
- All zone ingress instances of a zone are down.

When it happens:

- Communication and operation within each zone is unaffected.
- Communication across each zone will fail.

{% tip %}
With the right resiliency setup ({% if_version lte:2.5.x %}[Retries](/docs/{{ page.release }}/policies/retry){% endif_version %}{% if_version gte:2.6.x %}[MeshRetries](/docs/{{ page.release }}/policies/meshretry){% endif_version %}, {% if_version lte:2.5.x %}[Probes](/docs/{{ page.release }}/policies/health-check){% endif_version %}{% if_version gte:2.6.x %}[MeshHealthCheck](/docs/{{ page.release }}/policies/meshhealthcheck){% endif_version %}, {% if_version lte:2.5.x %}[Locality Aware LoadBalancing](/docs/{{ page.release }}/policies/locality-aware){% endif_version %}{% if_version gte:2.6.x %}[MeshLoadBalancingStrategy](/docs/{{ page.release }}/policies/meshloadbalancingstrategy){% endif_version %}, {% if_version lte:2.5.x %}[Circuit Breakers](/docs/{{ page.release }}/policies/circuit-breaker){% endif_version %}{% if_version gte:2.6.x %}[MeshCircuitBreakers](/docs/{{ page.release }}/policies/meshcircuitbreaker){% endif_version %}) the failing zone can be quickly severed and traffic re-routed to another zone.
{% endtip %}
