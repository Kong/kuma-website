---
title: Concepts
---

In this page we will introduce concepts that are core to understanding {{ site.mesh_product_name }}.

## Control Plane

The control plane is the central management layer of {{ site.mesh_product_name }}. It is responsible for configuring and managing the behavior of the data plane,
which handles the actual traffic between services.

## Data Plane

The data plane handles traffic between services.
In practice these are the apps that you build and that you want to put inside you service-mesh.

### Data Plane Proxy / Sidecar

The data plane proxy or sidecar is the instance of Envoy running alongside the application which will send and receive traffic from the rest of the service mesh.
It connects to the control plane which computes a configuration specific to it.

{% mermaid %}

flowchart LR
clients
servers

subgraph data plane
app
subgraph data plane proxy/Envoy
inbounds
outbounds
end
end

inbounds -.local traffic.-> app
app -.local traffic.-> outbounds

clients --> inbounds
outbounds --> servers

{% endmermaid %}

#### Inbound

An inbound is the part of the data plane proxy which receives traffic for a specific port.
Inbounds are usually grouped between different data planes and form a service.

#### Outbound

An outbound is the part of the data plane proxy which sends traffic for a specific service.
Outbounds group multiple remote inbounds as endpoints.

## Resource

A resource is an object or entity that can be created, managed, and interacted with in {{ site.mesh_product_name }}.
Resources are the building blocks that define the behavior and state of your service mesh.
Each resource is defined as a type of API object that has a specific purpose and is represented by its state and configuration.

A resource is most often expressed as yaml and can have 2 formats:

- `Kubernetes` when the backing control plane runs on Kubernetes. In this case {{ site.mesh_product_name }} resources are defined as Kubernetes Custom Resource Definitions.
- `Universal` in other cases or when accessing resources through {{ site.mesh_product_name}}'s REST api.

Resources are most commonly represented in yaml format.

### Policy

Policies are a specific type of resources that controls the behaviour and communication of applications running inside your service mesh.
They can enable traffic management, security, observability and traffic reliability.

Policies always have a clear specific area of impact and goal.
To learn more about [policies checkout the in depth introduction](/docs/{{ page.release }}/policies/introduction).

## Transparent proxy

A transparent proxy is a server that intercepts network traffic going to and from a service without requiring any changes to the application code. In {{ site.mesh_product_name}}, it captures this traffic and routes it to the data plane proxy, allowing policies to be applied.

For more details, see the [Transparent Proxy](/docs/{{ page.release }}/{% if_version lte:2.8.x %}production/dp-config/transparent-proxying/{% endif_version %}{% if_version gte:2.9.x %}/networking/transparent-proxy/introduction/{% endif_version %}) documentation.
