---
sidebar: true
home: true
search: false
pageClass: is-home

# custom page data
testimonialPortraitSrc: /images/marco-cropped.jpg
testimonialPortraitAlt: Marco Palladino
---

<!-- page masthead -->

::: slot masthead-main-title
# Build, Secure and Observe<br> your modern Service Mesh
:::

::: slot masthead-sub-title
## The open-source control plane for your Service Mesh, delivering high performance and reliability.
:::

::: slot masthead-diagram
![Kuma service diagram](/images/diagrams/main-diagram@2x.png)
:::

<!-- feature blocks -->

::: slot feature-block-content-1
### Universal Control Plane
![Universal Control Plane diagram](/images/diagrams/diagram-universal-cp@2x.jpg)

Built on top of Envoy, Kuma is a modern control plane to orchestrate L4/L7 traffic, including Microservices and Service Mesh.
:::

::: slot feature-block-content-2
### Powerful Policies
![Universal Control Plane diagram](/images/diagrams/diagram-powerful-policies@2x.jpg)

Out of the box Ingress and Service Mesh service management policies for security, observability, routing, and more.
:::

::: slot feature-block-content-3
### Platform Agnostic
![Platform Agnostic diagram](/images/diagrams/diagram-platform-agnostic@2x.jpg)

Enterprise-ready and platform agnostic with native Kubernetes + CRD support, as well as VM and Bare Metal via YAML + REST.
:::

<!-- testimonial -->

::: slot testimonial-content 
Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore
:::

::: slot testimonial-author
Marco Palladino,
:::

::: slot testimonial-author-info
CTO, [Kong, Inc.](https://konghq.com/)
:::

<!-- steps -->

::: slot steps-title
## Build your Service Mesh in 3 steps
:::

::: slot step-1-content
### Download and Install Kuma CP
To get started you can download Kuma and install it using the Kuma CLI application: &#96;kumactl&#96;.
:::

::: slot step-1-code-block
```
$ kumactl install control-plane | kubectl apply -f
```
:::

::: slot step-2-content
### Install the sidecar Envoy DP
Once Kuma is up and running, it's now time to install the Envoy sidecars - that Kuma will 
later orchestrate - next to any service we want to include into our Service Mesh.
:::

::: slot step-2-code-block
```
$ kumactl install data-plane | kubectl apply -f
```
:::

::: slot step-3-content
### Apply Policies
Congratulations, your Service Mesh is up and running. We can now instruct Kuma to enhance our 
Service Mesh with powerful policies like mTLS.
:::

::: slot step-3-code-block
```
$ kumactl create policy \
  --name mtls \
  --conf topology=hybrid
```
:::

<!-- before and after -->

::: slot before-after-title
## Unparalleled Productivity
:::

::: slot before-after-diagram-1
![Before implementing Kuma](/images/diagrams/diagram-before@2x.jpg)
:::

::: slot before-after-diagram-2
![After implementing Kuma](/images/diagrams/diagram-after@2x.jpg)
:::

<!-- newsletter -->

::: slot newsletter-title
## Get Community Updates
:::

::: slot newsletter-content
Sign up for our Kuma community newsletter to get the most recent updates and product announcements.
:::