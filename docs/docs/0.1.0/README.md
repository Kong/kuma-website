# Welcome to Kuma

::: tip
**Protip**: Use `#kumamesh` on Twitter to chat about Kuma.
:::

Welcome to the official documentation for Kuma!

Here you will find all you need to know about the product. While Kuma is ideal for Service Mesh and Microservices, you will soon realize that it can be used to modernize any architecture. That's why we call it *Universal Control Plane*.

## What is Kuma?

Kuma is a universal open-source control plane for Service Mesh and Microservices that can run and be operated natively across both Kubernetes and VM environments, in order to be easily adopted by every team in the organization.

Built on top of Envoy, Kuma can instrument any L4/L7 traffic to secure, observe, route and enhance connectivity between any service or database. It can be used natively in Kubernetes via CRDs or via a RESTful API across other environments, and it doesn't require to change our application's code in order to be used.

While being simple to use for most use-cases, Kuma also provides policies to configure the underlying Envoy data-planes in a more fine grained way, therefore catering to both first time user of Service Mesh, as well as most experienced ones.

<center>
<img src="/images/docs/0.1.0/diagram-01.jpg" alt="" style="width: 500px; padding-top: 20px; padding-bottom: 10px;"/>
</center>

Built by Kong with feedback from 150+ enterprise organizations running Service Mesh in production, Kuma implements a pragmatic approach that is very different from the 1st generation control planes: it runs with low operational overhead across all the organization, it supports every platform, and it's easy to use while relying on a solid networking foundation delivered by Envoy.

Built by Envoy contributors at Kong 🦍.

::: tip
**Need help?** Don't forget to check the [Community](/community) section! 
:::

## Why Kuma?

When building any software architecture inevitably we will introduce services that will communicate with each other by making requests on the network. 

For example, think of any application that communicates with a database to store or retrieve data, or think of a more complex microservice-oriented application that makes many requests across different services to execute its operations:

<center>
<img src="/images/docs/0.1.0/diagram-02.jpg" alt="" style="width: 550px; padding-top: 20px; padding-bottom: 10px;"/>
</center>

Every time our services connect to each other via a network request we put the end-user experience at risk. As we all know the connectivity between different services can be slow and unpredictable, it can be unsecure, and it can be hard to trace, among the other problems (routing, versioning, canary deployments, and so on).

Usually at this point developers take one of the following actions to remedy the situation:

* **Write more code**: A *smart* client is being built that every service will have to utilize in the form of a library. Usually this approach introduces a few problems: it creates more technical debt, it is usually language-specific therefore it prevents innovation, or multiple implementations of the library exist which creates fragmentation in the long run.

* **Sidecar proxy**: The services delegate all the connectivity and observability concerns to an out-of-process runtime, that will be on the execution path of every request. It will proxy all the outgoing connections and accept all the incoming ones. By using this approach developers don't worry about connectivity and only focus on delivering business value from their services.

::: tip
**Sidecar Proxy**: It's called *sidecar* proxy because it's another process running alongside our service on the same host, like a motorcycle sidecar. There is going to be one sidecar proxy for each running instance of our services.
:::

The sidecar proxy model **requires** a control plane that allows to configure the behavior of the data-planes and keep track of the state of our services. Teams that adopt the sidecar proxy model they usually either build a control plane from scratch, or they use existing general purpose control planes available on the market, Kuma being one of them. [Compare Kuma with other CPs](#kuma-vs-xyz).

<center>
<img src="/images/docs/0.1.0/diagram-03.jpg" alt="" style="width: 550px; padding-top: 20px; padding-bottom: 10px;"/>
</center>

::: tip
**Service Mesh**: An architecture made of sidecar proxies being deployed next to our services (the data-planes, or DPs), and a control plane (CP) controlling those DPs, is called Service Mesh. Usually Service Mesh is being mentioned in the context of Kubernetes, but anybody can build Service Meshes on any platform (including VMs and Bare Metal).
:::

With Kuma we have the main goal of reducing the code that has to be written and maintained in order to build reliable architectures, therefore Kuma embraces the sidecar proxy model by leveraging Envoy as its sidecar data-plane technology.

By outsourcing all the connectivity, security and routing concerns to a sidecar proxy we can now build applications faster, focus on the core functionality of our services in order to drive more business, and build a more secure and standardized architecture by reducing fragmentation.

In addition to this, by reducing the overall code that our teams have to create and maintain over time, we can also modernize our applications over time piece by piece without having to bite more than we can chew.

<center>
<img src="/images/docs/0.1.0/diagram-04.jpg" alt="" style=" padding-top: 20px; padding-bottom: 10px;"/>
</center>

[Learn more](#enabling-modernization) about how Kuma enables modernization within our existing architectures.

## Kuma vs XYZ

When Service Mesh first became mainstream around 2017, a few control planes were released by small and large organizations in other to support the first implementations of this new architectural pattern.

These control planes captured a lot of enthusiasm in the early days, but they all lacked pragmatism into creating a viable journey to Service Mesh adoption within existing organizations.

* **Greenfield-only**: Hyper-focused on new greenfield applications, without providing a journey to modernize existing workloads running on VM and Bare Metal platforms where the current business runs today, in addition to Kubernetes.
* **Complicated to use**: Service Mesh doesn't have to be complicated, but early implementations were hard to use, offered poor documentation and not a clear upgrade path to mitigate breaking changes.
* **Hard to deploy**: Many moving parts that have to be running well at the same time, while making it harder to run and scale a Service Mesh with the side-effect of higher operational costs.
* **For hobbists, not organizations**: Lack of understanding of the challenges enterprise organizations face today, with poor support and implementation models.

Kuma exists today to provide a pragmatic journey to implementing Service Mesh for the entire organization and for every team: for those running on modern Kubernetes environments and for those running on more traditional platforms like Virtual Machines and Bare Metal.

* **Universal and Kubernetes-Native**: Platform-agnostic, can run and operate anywhere.
* **Easy to use**: Via automation and a gradual learning curve to Service Mesh policies.
* **Simple to deploy**: In one step, across both Kubernetes and other platforms.
* **Enterprise-Ready**: Pragmatic platform for the Enterprise that delivers business value today.

::: tip
**Real-Time Support**: The Kuma community provides channels for real-time communication and support that you can explore in our [Community](/community) page. It also provides dedicated [Enterprise Support](/request-demo) delivered by [Kong](https://konghq.com).
:::

## Enabling Modernization

Until now Service Mesh has been considered to be the last step of architecture modernization after transitioning to containers and perhaps to Kubernetes. This approach is completely backwards, since it makes the adoption and the business value of service mesh available only after implementing other massive transformations that - in the meanwhile - can go wrong.

In reality, we want service mesh to be available *before* we implement other transitions so that we can keep the network both secure and observable in the process. With Kuma, service mesh is indeed the **first step** towards modernization.

Unlike other control planes, Kuma natively runs across any platform and it's not limited in scope (ie, Kubernetes only). Kuma works on both existing brownfield applications (those apps that deliver business value today), as well as new modern greenfield applications that will be the future of our journey.

Unlike other control planes, Kuma is easy to use. Anybody - from any team - can implement Kuma in three simple steps across both traditional monolithic applications and modern microservices.

Finally, by leveraging out of the box policies and Kuma's powerful tagging selectors, we can implement all sort of behaviors when it comes to both simple and complex topologies, like multi-cloud and multi-region architectures.
