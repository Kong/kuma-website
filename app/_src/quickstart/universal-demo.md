---
title: Deploy Kuma on Universal
---

This demo shows how to run {{site.mesh_product_name}} in Universal mode on a single machine.

To start learning how {{site.mesh_product_name}} works, you will run and secure a simple demo application that consists of two services:

- `demo-app`: a web application that lets you increment a numeric counter. It listens on port 5000
- `redis`: data store for the counter

{% mermaid %}
---
title: service graph of the demo app
---
flowchart LR
demo-app(demo-app :5000)
redis(redis :6379)
demo-app --> redis
{% endmermaid %}

## Prerequisites

* [Redis installed, not running](https://redis.io/docs/getting-started/)

## Install {{site.mesh_product_name}}

To download {{site.mesh_product_name}} we will use official installer, it will automatically detect the operating system (Amazon Linux, CentOS, RedHat, Debian, Ubuntu, and macOS) and download {{site.mesh_product_name}}:

```sh
curl -L {{site.links.web}}{% if page.edition and page.edition != "kuma" %}/{{page.edition}}{% endif %}/installer.sh | VERSION={% if page.version_data.label == "dev" %}preview{% else %}{{ page.version_data.version }}{% endif %} sh -
```

To finish installation we need to add {{site.mesh_product_name}} binaries to path: 

```sh
export PATH=$PATH:$(pwd)/{{site.mesh_product_name_path}}-{{ page.version_data.version }}/bin
```

## Start control plane

Now we need to start [control plane](/docs/{{ page.release }}/introduction/concepts#control-plane) in background by running command:

```sh
kuma-cp run > cp-logs.txt 2>&1 &
```

To check if control plane started without issues you can check logs:

```sh
tail cp-logs.txt
```

## Deploy demo application

### Generate tokens for data plane proxies

On Universal we need to manually create tokens for [data plane proxies](/docs/{{ page.release }}/introduction/concepts#data-plane). To do this need to run this commands (these tokens will be valid
for 30 days):

```sh
mkdir /tmp/kuma
kumactl generate dataplane-token --tag kuma.io/service=redis --valid-for=720h > /tmp/kuma/token-redis
kumactl generate dataplane-token --tag kuma.io/service=demo-app --valid-for=720h > /tmp/kuma/token-demo-app
```

After generating tokens we can start the data plane proxies that will be used for proxying traffic between `demo-app` and `redis`.

### Start the data plane proxies

{% warning %}
Because this is a quickstart, we don't setup [certificates for communication
between the data plane proxies and the control plane](/docs/{{ page.release }}/production/secure-deployment/certificates/#encrypted-communication).
You'll see a warning like the following in the `kuma-dp` logs:

```
2024-07-25T20:06:36.082Z	INFO	dataplane	[WARNING] The data plane proxy cannot verify the identity of the control plane because you are not setting the "--ca-cert-file" argument or setting the KUMA_CONTROL_PLANE_CA_CERT environment variable.
```

This isn't related to mTLS between services.
{% endwarning %}

First we can start the data plane proxy for `redis`. On Universal we need to manually create Dataplane [resources](/docs/{{ page.release }}/introduction/concepts#resource) for data plane proxies, and 
run kuma-dp manually, to do this run:

{% capture env-vars-redis -%}
KUMA_READINESS_PORT=9901
{%- if_version gte:2.9.x %} \
KUMA_APPLICATION_PROBE_PROXY_PORT=9902
{%- endif_version -%}
{% endcapture %}

```sh
{{ env-vars-redis }} \
kuma-dp run \
  --cp-address=https://localhost:5678/ \
  --dns-enabled=false \
  --dataplane-token-file=/tmp/kuma-token-redis \
  --dataplane="
  type: Dataplane
  mesh: default
  name: redis
  networking: 
    address: 127.0.0.1
    inbound: 
      - port: 16379
        servicePort: 26379
        serviceAddress: 127.0.0.1
        tags: 
          kuma.io/service: redis
          kuma.io/protocol: tcp
    admin:
      port: 9903"
```

You can notice that we are manually specifying the readiness port with environment variable `KUMA_READINESS_PORT`, when each data plane is 
running on separate machines this is not required. 

{% warning %}
We need a separate terminal window, with the same binaries directory as above added to `PATH`. So assuming the same initial directory:

```sh
export PATH=$PATH:$(pwd)/{{site.mesh_product_name_path}}-{{ page.version_data.version }}/bin
```
{% endwarning %}

Now we can start the data plane proxy for our demo-app, we can do this by running:

{% capture env-vars-demo-app -%}
KUMA_READINESS_PORT=9904
{%- if_version gte:2.9.x %} \
KUMA_APPLICATION_PROBE_PROXY_PORT=9905
{%- endif_version -%}
{% endcapture %}

```sh
{{ env-vars-demo-app }} \
kuma-dp run \
  --cp-address=https://localhost:5678/ \
  --dns-enabled=false \
  --dataplane-token-file=/tmp/kuma-token-demo-app \
  --dataplane="
  type: Dataplane
  mesh: default
  name: demo-app
  networking: 
    address: 127.0.0.1
    outbound:
      - port: 6379
        tags:
          kuma.io/service: redis
    inbound: 
      - port: 15000
        servicePort: 5000
        serviceAddress: 127.0.0.1
        tags: 
          kuma.io/service: demo-app
          kuma.io/protocol: http
    admin:
      port: 9906"
```

### Run kuma-counter-demo app

We will start the kuma-counter-demo in a new terminal window:

1. With the data plane proxies running, we can start our apps, first we will start and configure `Redis`:

   ```sh
   redis-server --port 26379 --daemonize yes && redis-cli -p 26379 set zone local
   ```

   You should see message `OK` from `Redis` if this operation was successful.

2. Now we can start our `demo-app`. To do this we need to download repository with its source code:

   ```sh
   git clone https://github.com/kumahq/kuma-counter-demo.git && cd kuma-counter-demo
   ```

3. Now we need to run:

   ```sh
   npm install --prefix=app/ && npm start --prefix=app/
   ```

   If `demo-app` was started correctly you will see message:

   ```
   Server running on port 5000
   ```

   In a browser, go to [127.0.0.1:5000](http://127.0.0.1:5000) and increment the counter. `demo-app` GUI should work without issues now.

## Explore {{site.mesh_product_name}} GUI

You can view the sidecar proxies that are connected to the {{site.mesh_product_name}} control plane.

{{site.mesh_product_name}} ships with a **read-only** [GUI](/docs/{{ page.release }}/production/gui) that you can use to retrieve {{site.mesh_product_name}} resources. 
By default, the GUI listens on the API port which defaults to `5681`.

To access {{site.mesh_product_name}} we need to navigate to [127.0.0.1:5681/gui](http://127.0.0.1:5681/gui) in your browser.

To learn more, read the [documentation about the user interface](/docs/{{ page.release }}/production/gui).

## Introduction to zero-trust security

By default, the network is **insecure and not encrypted**. We can change this with {{site.mesh_product_name}} by enabling 
the [Mutual TLS](/docs/{{ page.release }}/policies/mutual-tls/) policy to provision a Certificate Authority (CA) that 
will automatically assign TLS certificates to our services (more specifically to the injected data plane proxies running 
alongside the services).

We can enable Mutual TLS with a `builtin` CA backend by executing:

{% if_version lte:2.8.x %}
```sh
echo 'type: Mesh
name: default
mtls:
  enabledBackend: ca-1
  backends:
    - name: ca-1
      type: builtin' | kumactl apply -f -
```
{% endif_version %}
{% if_version gte:2.9.x %}
```sh
echo 'type: Mesh
name: default
meshServices:
  mode: Exclusive
mtls:
  enabledBackend: ca-1
  backends:
    - name: ca-1
      type: builtin' | kumactl apply -f -
```
{% endif_version %}

The traffic is now **encrypted and secure**. {{site.mesh_product_name}} does not define default traffic permissions, which 
means that no traffic will flow with mTLS enabled until we define a proper [MeshTrafficPermission](/docs/{{ page.release }}/policies/meshtrafficpermission) 
[policy](/docs/{{ page.release }}/introduction/concepts#policy). 

For now, the demo application won't work.
You can verify this by clicking the increment button again and seeing the error message in the browser.
We can allow the traffic from the `demo-app` to `redis` by applying the following `MeshTrafficPermission`:

```sh
echo 'type: MeshTrafficPermission 
name: allow-from-demo-app
mesh: default 
spec: 
  targetRef: 
    kind: MeshSubset
    tags:
      kuma.io/service: redis
  from: 
    - targetRef: 
        kind: MeshSubset 
        tags:
          kuma.io/service: demo-app
      default: 
        action: Allow' | kumactl apply -f -
```

You can click the increment button, the application should function once again.
However, the traffic to `redis` from any other service than `demo-app` is not allowed.

## Next steps

* Explore the [Features](/features) available to govern and orchestrate your service traffic.
* Learn more about what you can do with the [GUI](/docs/{{ page.release }}/production/gui).
* Explore further installation strategies for [single-zone](/docs/{{ page.release }}/production/cp-deployment/single-zone) and [multi-zone](/docs/{{ page.release }}/production/cp-deployment/multi-zone) environments.
* Read the [full documentation](/docs/{{ page.release }}/) to learn about all the capabilities of {{site.mesh_product_name}}.
{% if site.mesh_product_name == "Kuma" %}* Chat with us at the official [Kuma Slack](/community) for questions or feedback.{% endif %}
