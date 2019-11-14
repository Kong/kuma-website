# Documentation

::: tip
**Need help?** Installing and using Kuma should be as easy as possible. [Contact and chat](/community) with the community in real-time if you get stuck or need clarifications. We are here to help.
:::

It's time to start using Kuma and build your Service Mesh. In this section you will find the technical material to get up and running 🚀. 

If you haven't read the first [Welcome to Kuma](/docs/DRAFT) section, we strongly suggest to start from here.

## Overview

As we have [already learned](/docs/DRAFT), Kuma is a universal control plane that can run across both modern environments like Kubernetes and more traditional VM-based ones.

The first step is obviously to [download and install Kuma](/install/DRAFT) on the platform of your choice. Different distributions will present different installation instructions that follow the best practices for the platform you have selected.

Regardless of what platform you decide to use, the fundamental behavior of Kuma at runtime will not change across different distributions. These fundamentals are important to explore in order to understand what Kuma is and how it works.

::: tip
Installing Kuma on Kubernetes is fully automated, while installing Kuma on Linux requires the user to run the Kuma executables. Both ways are very simple, and can be explored from the [installation page](/install/DRAFT).
:::

There are two main components of Kuma that are very important to understand:

* **Control-Plane**: Kuma is first and foremost a control-plane that will accept user input (you are the user) in order to create and configure [Policies](/docs/DRAFT/policies) like [Service Meshes](/docs/DRAFT/policies/#mesh), and in order to add services and configure their behavior within the Meshes you have created.
* **Data-Plane**: Kuma also bundles a data-plane implementation based on top of [Envoy](https://www.envoyproxy.io/) for convenience, in order to get up and running quickly. An instance of the data-plane will run alongside every instance of our services, and it will process both incoming and outgoing requests for the service.

::: tip
**Multi-Mesh**: Kuma ships with multi-tenancy support since day one. This means you can create and configure multiple isolated Service Meshes from **one** control-plane. By doing so we lower the complexity and the operational cost of supporting multiple meshes. [Explore Kuma's Policies](/docs/DRAFT/policies).
:::

Since Kuma bundles a data-plane in addition to the control-plane, we decided to call the executables `kuma-cp` and `kuma-dp` to differentiate them. Let's take a look at all the executables that ship with Kuma:

* `kuma-cp`: this is the main Kuma executable that runs the control plane (CP).
* `kuma-dp`: this is the Kuma data-plane executable that - under the hood - invokes `envoy`.
* `envoy`: this is the Envoy executable that we bundle for convenience into the archive.
* `kumactl`: this is the the user CLI to interact with Kuma (`kuma-cp`) and its data.
* `kuma-tcp-echo`: this is a sample application that echos back the requests we are making, used for demo purposes.

In addition to these binaries, there is another binary that will be executed when running on Kubernetes:

* `kuma-injector`: only for Kubernetes, this is a process that listens to events propagated by Kubernetes, and that automatically injects a `kuma-dp` sidecar container to our services.

A minimal Kuma deployment involves one or more instances of the control-plane (`kuma-cp`), and one or more instances of the data-planes (`kuma-dp`) which will connect to the control-plane as soon as they startup. Kuma supports two modes:

* `universal`: when it's being installed on a Linux compatible machine like MacOS, Virtual Machine or Bare Metal. This also includes those instances where Kuma is being installed on a Linux base machine (ie, a Docker image).
* `kubernetes`: when it's being deployed - well - on Kubernetes.

### Universal mode

When running in **Universal** mode, Kuma will require a PostgreSQL database to store its state. The PostgreSQL database and schema will have to be initialized accordingly to the installation instructions.

Unlike `kubernetes` mode, Kuma won't require the `kuma-injector` executable to run:

<center>
<img src="/images/docs/0.2.0/diagram-09.jpg" alt="" style="width: 500px; padding-top: 20px; padding-bottom: 10px;"/>
</center>

### Kubernetes mode

When running on **Kubernetes**, Kuma will store all of its state and configuration on the underlying Kubernetes API Server, therefore requiring no dependency to store the data. But it requires the `kuma-injector` executable to run in a Pod (only one instance per Kubernetes cluster) so that it can automatically inject `kuma-dp` on any Pod that belongs to a Namespace that includes the following label:

```
kuma.io/sidecar-injection: enabled
```

When following the installation instructions, `kuma-injector` will be automatically started.

<center>
<img src="/images/docs/0.2.0/diagram-08.jpg" alt="" style="width: 500px; padding-top: 20px; padding-bottom: 10px;"/>
</center>

::: tip
**Full CRD support**: When using Kuma in Kubernetes mode you can create [Policies](/docs/DRAFT/policies) with Kuma's CRDs applied via `kubectl`.
:::

### Last but not least

Once the `kuma-cp` process is started, it waits for [data-planes](#dps-and-data-model) to connect, while at the same time accepting user-defined configuration to start creating Service Meshes and configuring the behavior of those meshes via Kuma [Policies](/docs/DRAFT/policies).

When we look at a typical Kuma installation, at a higher level it works like this:

<center>
<img src="/images/docs/0.2.0/diagram-06.jpg" alt="" style="padding-top: 20px; padding-bottom: 10px;"/>
</center>

When we unpack the underlying behavior, it looks like this:

<center>
<img src="/images/docs/0.2.0/diagram-07.jpg" alt="" style="padding-top: 20px; padding-bottom: 10px;"/>
</center>

::: tip
**xDS APIs**: Kuma implements the [xDS](https://www.envoyproxy.io/docs/envoy/latest/configuration/overview/v2_overview) APIs of Envoy in the `kuma-cp` application so that the Envoy DPs can connect to it and retrieve their configuration.
:::

## Backends

As explained in the [Overview](#overview), when Kuma (`kuma-cp`) is up and running it needs to store data somewhere. The data will include the state, the policies configured, the data-planes status, and so on.

Kuma supports a few different backends that we can use when running `kuma-cp`. You can configure the backend storage by setting the `KUMA_STORE_TYPE` environment variable when running the control plane.

::: tip
This information has been documented for clarity, but when following the [installation instructions](/install/DRAFT) these settings will be automatically configured.
:::

The backends are:

* `memory` (**default**): Kuma stores all the state in-memory. This means that restarting Kuma will delete all the data. Only reccomend when playing with Kuma locally. For example:

```sh
$ KUMA_STORE_TYPE=memory kuma-cp run
```

This is the **default** memory store if `KUMA_STORE_TYPE` is not being specified.

* `postgres`: Kuma stores all the state in a PostgreSQL database. Used when running in Universal mode. You can also use a remote PostgreSQL database offered by any cloud vendor. For example:

```sh
$ KUMA_STORE_TYPE=postgres \
  KUMA_STORE_POSTGRES_HOST=localhost \
  KUMA_STORE_POSTGRES_PORT=5432 \
  KUMA_STORE_POSTGRES_USER=kuma-user \
  KUMA_STORE_POSTGRES_PASSWORD=kuma-password \
  KUMA_STORE_POSTGRES_DB_NAME=kuma \
  kuma-cp run
```

* `kubernetes`: Kuma stores all the state in the underlying Kubernetes cluster. User when running in Kubernetes mode. For example:

```sh
$ KUMA_STORE_TYPE=kubernetes kuma-cp run
```

## Dependencies

Kuma (`kuma-cp`) is one single executable written in GoLang that can be installed anywhere, hence why it's both universal and simple to deploy. 

* Running on **Kubernetes**: No external dependencies required, since it leverages the underlying K8s API server to store its configuration. A `kuma-injector` service will also start in order to automatically inject sidecar data-plane proxies without human intervention.

* Running on **Universal**: Kuma requires a PostgreSQL database as a dependency in order to store its configuration. PostgreSQL is a very popular and easy database. You can run Kuma with any managed PostgreSQL offering as well, like AWS RDS or Aurora. Out of sight, out of mind!

Out of the box, Kuma ships with a bundled [Envoy](https://www.envoyproxy.io/) data-plane ready to use for our services, so that you don't have to worry about putting all the pieces together.

::: tip
Kuma ships with an executable `kuma-dp` that will execute the bundled `envoy` executable in order to execute the data-plane proxy. The behavior of the data-plane executable is being explained in the [Overview](#overview).
:::

[Install Kuma](/install/DRAFT) and follow the instructions to get up and running in a few steps.

## DPs and Data Model

When Kuma (`kuma-cp`) runs, it will be waiting for the data-planes to connect and register themselves. In order for a data-plane to successfully run, two things have to happen before being executed:

* There must exist at least one [`Mesh`](/docs/DRAFT/policies/#mesh) in Kuma. By default the system auto-generates a `default` Mesh when the control-plane is run for the first time.
* There must exist a [`Dataplane`](#dataplane-entity) entity in Kuma **before** the actual data-plane tries to connect to it via `kuma-dp`.

<center>
<img src="/images/docs/0.2.0/diagram-10.jpg" alt="" style="width: 500px; padding-top: 20px; padding-bottom: 10px;"/>
</center>

::: tip
On Universal the [`Dataplane`](#dataplane-entity) entity must be **manually** created before starting `kuma-dp`, on Kubernetes it is **automatically** created.
:::

### Dataplane Entity

A `Dataplane` entity must be created on the CP `kuma-cp` before a `kuma-dp` instance attempts to connect to the control-plane. On Kubernetes, this operation is fully **automated**. On Universal, it must be executed **manually**.

To understand why the `Dataplane` entity is required, we must take a step back. As we have explained already, Kuma follow a sidecar proxy model for the data-planes, where we have an instance of a data-plane for every instance of our services. Each Service and DP will communicate with each other on the same machine, therefore on `127.0.0.1`.

For example, if we have 6 replicas of a "Redis" service, then we must have one instances of `kuma-dp` running alongside each replica of the service, therefore 6 replicas of `kuma-dp` as well.

<center>
<img src="/images/docs/0.2.0/diagram-11.jpg" alt="" style="width: 500px; padding-top: 20px; padding-bottom: 10px;"/>
</center>

::: tip
**Many DPs!** The number of data-planes that we have running can quickly add up, since we have one replica of `kuma-dp` for every replica of every service. That's why it's important for the DP process to be lightweight and consume a few resources, otherwise we would quickly run out of memory, especially on platforms like Kubernetes where multiple services are running on the same underlying host machine. And that's one of the reasons why Kuma leverages Envoy for this task.
:::

When we start a new data-plane in Kuma, **two things** have to happen:

1. The data-plane needs to advertise what service it is responsible for. This is what the `Dataplane` entity does.
2. The data-plane process needs to start accepting incoming and outgoing requests.

These steps are being executed in **two separate** commands:

1. We register the `Dataplane` object via the `kumactl` or HTTP API.
2. Once we have registered the DP, we can start it by running `kuma-dp run`.

::: tip
**Remember**: this is all automated if you are running Kuma on Kubernetes!
:::

The registration of the `Dataplane` includes two main sections that are described below in the [Dataplane Specification](#dataplane-specification):

* `inbound` networking configuration, to configure on what port the DP will listen to accept external requests, specify on what port the service is listening on the same machine (for internal DP <> Service communication), and the [Tags](#tags) that belong to the service. 
* `outbound` networking configuration, to enable the local service to consume other services.

For example, this is how we register a `Dataplane` for an hypotetical Redis service and then start the `kuma-dp` process:

```sh
echo "type: Dataplane
mesh: default
name: redis-1
networking:
  inbound:
  - interface: 127.0.0.1:9000:6379
    tags:
      service: redis" | kumactl apply -f -

KUMA_CONTROL_PLANE_BOOTSTRAP_SERVER_URL=http://control-plane:5682 \
KUMA_DATAPLANE_MESH=default \
KUMA_DATAPLANE_NAME=redis-1 \
kuma-dp run
```

In the example above, any external client who wants to consume Redis will have to make a request to the DP on port `9000`, which internally will be redirected to the Redis service listening on port `6379`.

Now let's assume that we have another service called "Backend" that internally listens on port `80`, and that makes outgoing requests to the `redis` service:

```sh
echo "type: Dataplane
mesh: default
name: backend-1
networking:
  inbound:
  - interface: 127.0.0.1:8000:80
    tags:
      service: backend
  outbound:
  - interface: :10000
    service: redis" | kumactl apply -f -

KUMA_CONTROL_PLANE_BOOTSTRAP_SERVER_URL=http://control-plane:5682 \
KUMA_DATAPLANE_MESH=default \
KUMA_DATAPLANE_NAME=backend-1 \
kuma-dp run
```

In order for the `backend` service to successfully consume `redis`, we specify an `outbound` networking section in the `Dataplane` configuration instructing the DP to listen on a new port `10000` and to proxy any outgoing request on port `10000` to the `redis` service. For this to work, we must update our application to consume `redis` on `127.0.0.1:10000`.

::: tip
As mentioned before, this is only required in Universal. In Kubernetes no change to our applications are required thanks to automated transparent proxying.
:::

### Envoy

Since `kuma-dp` is built on top of Envoy, you can enable the [Envoy HTTP API](https://www.envoyproxy.io/docs/envoy/latest/operations/admin) by starting `kuma-dp` with an additional `KUMA_DATAPLANE_ADMIN_PORT=9901` environment variable (or by setting the `--admin-port=9901` argument). This can be very useful for debugging purposes.

### Tags

A data-plane can have many labels that define its role within your architecture. It is obviously associated to a service, but can also have some other properties that we might want to define. For example, if it runs in a specific world region, or a specific cloud vendor. In Kuma these labels are called `tags` and they are being set in the [`Dataplane`](#dataplane-entity) entity.

::: tip
There is one special tag, the `service` tag, that must always be set.
:::

Tags are important because can be used later on by any [Policy](/docs/DRAFT/policies) that Kuma supports now and in the future. For example, it will be possible to route requests from one region to another assuming there is a `region` tag associated to the data-planes.

### Dataplane Specification

The [`Dataplane`](#dataplane-entity) entity includes the networking and naming configuration that a data-plane proxy (`kuma-dp`) must have attempting to connect to the control-plane (`kuma-cp`).

In Universal mode we must manually create the [`Dataplane`](#dataplane-entity) entity before running `kuma-dp`. A [`Dataplane`](#dataplane-entity) entity can be created with [`kumactl`](#kumactl) or by using the [HTTP API](#http-api). When using [`kumactl`](#kumactl), the entity definition will look like:

```yaml
type: Dataplane
mesh: default
name: web-01
networking:
  inbound:
  - interface: 127.0.0.1:11011:11012
    tags:
      service: backend
  outbound:
  - interface: :33033
    service: redis
```

The `Dataplane` entity includes a few sections:

* `type`: must be `Dataplane`.
* `mesh`: the `Mesh` name we want to associate the data-plane with.
* `name`: this is the name of the data-plane instance, and it must be **unique** for any given `Mesh`. We might have multiple instances of a Service, and therefore multiple instances of the sidecar data-plane proxy. Each one of those sidecar proxy instances must have a unique `name`.
* `networking`: this is the meaty part of the configuration. It determines the behavior of the data-plane on incoming (`inbound`) and outgoing (`outbound`) requests.
  * `inbound`: an array of `interface` objects that determines what services are being exposed via the data-plane. Each `interface` object only supports one port at a time, and you can specify more than one `interface` in case the service opens up more than one port.
    * `interface`: determines the routing logic for incoming requests in the format of `{address}:{dataplane-port}:{service-port}`.
    * `tags`: each data-plane can include any arbitrary number of tags, with the only requirement that `service` is **mandatory** and it identifies the name of service. You can include tags like `version`, `cloud`, `region`, and so on to give more attributes to the `Dataplane` (attributes that can later on be used to apply policies).
  * `outbound`: every outgoing request made by the service must also go thorugh the DP. This object specifies ports that the DP will have to listen to when accepting outgoing requests by the service: 
    * `interface`: the address inclusive of the port that the service needs to consume locally to make a request to the external service
    * `service`: the name of the service associated with the interface.

::: tip
On Kubernetes this whole process is automated via transparent proxying and without changing your application's code. On Universal Kuma doesn't support transparent proxying yet, and the outbound service dependencies have to be manually specified in the [`Dataplane`](#dataplane-entity) entity. This also means that in Universal **you must update** your codebases to consume those external services on `127.0.0.1` on the port specified in the `outbound` section.
:::

### Kubernetes 

On Kubernetes the data-planes are automatically injected via the `kuma-injector` executable as long as the K8s Namespace includes the following label:

```
kuma.io/sidecar-injection: enabled
```

On Kubernetes the [`Dataplane`](#dataplane-entity) entity is also automatically created for you, and because transparent proxying is being used to communicate between the service and the sidecar proxy, no code changes are required in your applications.

## CLI

Kuma ships in a bundle that includes a few executables:

* `kuma-cp`: this is the main Kuma executable that runs the control plane (CP).
* `kuma-dp`: this is the Kuma data-plane executable that - under the hood - invokes `envoy`.
* `envoy`: this is the Envoy executable that we bundle for convenience into the archive.
* `kumactl`: this is the the user CLI to interact with Kuma (`kuma-cp`) and its data.
* `kuma-tcp-echo`: this is a sample application that echos back the requests we are making, used for demo purposes.

According to the [installation instructions](/install/DRAFT), some of these executables are automatically executed as part of the installation workflow, while some other times you will have to execute them directly.

You can check the usage of the executables by running the `-h` flag, like:

```sh
$ kuma-cp -h
```

and you can check their version by running the `version [--detailed]` command like:

```sh
$ kuma-cp version --detailed
```

## kumactl

The `kumactl` executable is a very important component in your journey with Kuma. It allows to:

* Retrieve the state of Kuma and the configured [policies](/docs/DRAFT/policies) in every environment.
* On **Universal** environments, it allows to change the state of Kuma by applying new policies with the `kumactl apply [..]` command.
* On **Kubernetes** it is **read-only**, because you are supposed to change the state of Kuma by leveraging Kuma's CRDs.
* It provides helpers to install Kuma on Kubernetes, and to configure the PostgreSQL schema on Universal (`kumactl install [..]`).

::: tip
The `kumactl` application is a CLI client for the underlying [HTTP API](#http-api) of Kuma. Therefore, you can access the state of Kuma by leveraging with the API directly. On Universal you will be able to also make changes via the HTTP API, while on Kubernetes the HTTP API is read-only.
:::

Available commands on `kumactl` are:

* `kumactl install [..]`: provides helpers to install Kuma in Kubernetes, or to configure the PostgreSQL database on Universal.
* `kumactl config [..]`: configures the local or remote control-planes that `kumactl` should talk to. You can have more than one enabled, and the configuration will be stored in `~/.kumactl/config`.
* `kumactl apply [..]`: used to change the state of Kuma. Only available on Universal.
* `kumactl get [..]`: used to retrieve the raw state of entities Kuma.
* `kumactl inspect [..]`: used to retrieve an augmented state of entities in Kuma.
* `kumactl help [..]`: help dialog that explains the commands available.
* `kumactl version [--detailed]`: shows the version of the program.

## HTTP API

Kuma ships with a RESTful HTTP interface that you can use to retrieve the state of your configuration and policies on every environment, and when running on Universal mode it will also allow to make changes to the state. On Kubernetes, you will use native CRDs to change the state in order to be consistent with Kubernetes best practices.

::: tip
**CI/CD**: The HTTP API can be used for infrastructure automation to either retrieve data, or to make changes when running in Universal mode. The [`kumactl`](#kumactl) CLI is built on top of the HTTP API, which you can also access with any other HTTP client like `curl`.
:::

By default the HTTP API is listening on port `5681`. The endpoints available are:

* `/meshes`
* `/meshes/{name}`
* `/meshes/{name}/dataplanes`
* `/meshes/{name}/dataplanes/{name}`

You can use `GET` requests to retrieve the state of Kuma on both Universal and Kubernetes, and `PUT` and `DELETE` requests on Universal to change the state.

### Meshes

#### Get Mesh
Request: `GET /meshes/{name}`

Response: `200 OK` with Mesh entity

Example:
```bash
curl http://localhost:5681/meshes/mesh-1
```
```json
{
  "name": "mesh-1",
  "type": "Mesh",
  "mtls": {
    "ca": {
      "builtin": {}
    },
    "enabled": true
  },
  "tracing": {},
  "logging": {
    "backends": [
      {
        "name": "file-tmp",
        "format": "{ \"destination\": \"%KUMA_DESTINATION_SERVICE%\", \"destinationAddress\": \"%UPSTREAM_LOCAL_ADDRESS%\", \"source\": \"%KUMA_SOURCE_SERVICE%\", \"sourceAddress\": \"%KUMA_SOURCE_ADDRESS%\", \"bytesReceived\": \"%BYTES_RECEIVED%\", \"bytesSent\": \"%BYTES_SENT%\"}",
        "file": {
          "path": "/tmp/access.log"
        }
      },
      {
        "name": "logstash",
        "tcp": {
          "address": "logstash.internal:9000"
        }
      }
    ]
  }
}
```

#### Create/Update Mesh
Request: `PUT /meshes/{name}` with Mesh entity in body

Response: `201 Created` when the resource is created and `200 OK` when it is updated

Example:
```bash
curl -XPUT http://localhost:5681/meshes/mesh-1 --data @mesh.json -H'content-type: application/json'
```
```json
{
  "name": "mesh-1",
  "type": "Mesh",
  "mtls": {
    "ca": {
      "builtin": {}
    },
    "enabled": true
  },
  "tracing": {},
  "logging": {
    "backends": [
      {
        "name": "file-tmp",
        "format": "{ \"destination\": \"%KUMA_DESTINATION_SERVICE%\", \"destinationAddress\": \"%UPSTREAM_LOCAL_ADDRESS%\", \"source\": \"%KUMA_SOURCE_SERVICE%\", \"sourceAddress\": \"%KUMA_SOURCE_ADDRESS%\", \"bytesReceived\": \"%BYTES_RECEIVED%\", \"bytesSent\": \"%BYTES_SENT%\"}",
        "file": {
          "path": "/tmp/access.log"
        }
      },
      {
        "name": "logstash",
        "tcp": {
          "address": "logstash.internal:9000"
        }
      }
    ]
  }
}
```

#### List Meshes
Request: `GET /meshes`

Response: `200 OK` with body of Mesh entities

Example:
```bash
curl http://localhost:5681/meshes
```
```json
{
  "items": [
    {
      "type": "Mesh",
      "name": "mesh-1",
      "mtls": {
        "ca": {
          "builtin": {}
        },
        "enabled": true
      },
      "tracing": {},
      "logging": {
        "backends": [
          {
            "name": "file-tmp",
            "format": "{ \"destination\": \"%KUMA_DESTINATION_SERVICE%\", \"destinationAddress\": \"%UPSTREAM_LOCAL_ADDRESS%\", \"source\": \"%KUMA_SOURCE_SERVICE%\", \"sourceAddress\": \"%KUMA_SOURCE_ADDRESS%\", \"bytesReceived\": \"%BYTES_RECEIVED%\", \"bytesSent\": \"%BYTES_SENT%\"}",
            "file": {
              "path": "/tmp/access.log"
            }
          },
          {
            "name": "logstash",
            "tcp": {
              "address": "logstash.internal:9000"
            }
          }
        ]
      }
    }
  ]
}
```

#### Delete Mesh
Request: `DELETE /meshes/{name}`

Response: `200 OK`

Example:
```bash
curl -XDELETE http://localhost:5681/meshes/mesh-1
```

### Dataplanes

#### Get Dataplane
Request: `GET /meshes/{mesh}/dataplanes/{name}`

Response: `200 OK` with Mesh entity

Example:
```bash
curl http://localhost:5681/meshes/mesh-1/dataplanes/backend-1
```
```json
{
  "type": "Dataplane",
  "name": "backend-1",
  "mesh": "mesh-1",
  "networking": {
    "inbound": [
      {
        "interface": "127.0.0.1:11011:11012",
        "tags": {
          "service": "backend",
          "version": "2.0",
          "env": "production"
        }
      }
    ],
    "outbound": [
      {
        "interface": ":33033",
        "service": "database"
      },
      {
        "interface": ":44044",
        "service": "user"
      }
    ]
  }
}
```

#### Create/Update Dataplane
Request: `PUT /meshes/{mesh}/dataplanes/{name}` with Dataplane entity in body

Response: `201 Created` when the resource is created and `200 OK` when it is updated

Example:
```bash
curl -XPUT http://localhost:5681/meshes/mesh-1/dataplanes/backend-1 --data @dataplane.json -H'content-type: application/json'
```
```json
{
  "type": "Dataplane",
  "name": "backend-1",
  "mesh": "mesh-1",
  "networking": {
    "inbound": [
      {
        "interface": "127.0.0.1:11011:11012",
        "tags": {
          "service": "backend",
          "version": "2.0",
          "env": "production"
        }
      }
    ],
    "outbound": [
      {
        "interface": ":33033",
        "service": "database"
      },
      {
        "interface": ":44044",
        "service": "user"
      }
    ]
  }
}
```

#### List Dataplanes
Request: `GET /meshes/{mesh}/dataplanes`

Response: `200 OK` with body of Dataplane entities

Example:
```bash
curl http://localhost:5681/meshes/mesh-1/dataplanes
```
```json
{
  "items": [
    {
      "type": "Dataplane",
      "name": "backend-1",
      "mesh": "mesh-1",
      "networking": {
        "inbound": [
          {
            "interface": "127.0.0.1:11011:11012",
            "tags": {
              "service": "backend",
              "version": "2.0",
              "env": "production"
            }
          }
        ],
        "outbound": [
          {
            "interface": ":33033",
            "service": "database"
          },
          {
            "interface": ":44044",
            "service": "user"
          }
        ]
      }
    }
  ]
}
```

#### Delete Dataplane
Request: `DELETE /meshes/{mesh}/dataplanes/{name}`

Response: `200 OK`

Example:
```bash
curl -XDELETE http://localhost:5681/meshes/mesh-1/dataplanes/backend-1
```

### Dataplane Overviews

#### Get Dataplane Overview
Request: `GET /meshes/{mesh}/dataplane+insights/{name}`

Response: `200 OK` with Dataplane entity including insight

Example:
```bash
curl http://localhost:5681/meshes/default/dataplanes+insights/example
```
```json
{
 "type": "DataplaneOverview",
 "mesh": "default",
 "name": "example",
 "dataplane": {
  "networking": {
   "inbound": [
    {
     "interface": "127.0.0.1:11011:11012",
     "tags": {
      "env": "production",
      "service": "backend",
      "version": "2.0"
     }
    }
   ],
   "outbound": [
    {
     "interface": ":33033",
     "service": "database"
    }
   ]
  }
 },
 "dataplaneInsight": {
  "subscriptions": [
   {
    "id": "426fe0d8-f667-11e9-b081-acde48001122",
    "controlPlaneInstanceId": "06070748-f667-11e9-b081-acde48001122",
    "connectTime": "2019-10-24T14:04:56.820350Z",
    "status": {
     "lastUpdateTime": "2019-10-24T14:04:57.832482Z",
     "total": {
      "responsesSent": "3",
      "responsesAcknowledged": "3"
     },
     "cds": {
      "responsesSent": "1",
      "responsesAcknowledged": "1"
     },
     "eds": {
      "responsesSent": "1",
      "responsesAcknowledged": "1"
     },
     "lds": {
      "responsesSent": "1",
      "responsesAcknowledged": "1"
     },
     "rds": {}
    }
   }
  ]
 }
}
```

#### List Dataplane Overviews
Request: `GET /meshes/{mesh}/dataplane+insights/`

Response: `200 OK` with Dataplane entities including insight

Example:
```bash
curl http://localhost:5681/meshes/default/dataplanes+insights
```
```json
{
  "items": [
    {
     "type": "DataplaneOverview",
     "mesh": "default",
     "name": "example",
     "dataplane": {
      "networking": {
       "inbound": [
        {
         "interface": "127.0.0.1:11011:11012",
         "tags": {
          "env": "production",
          "service": "backend",
          "version": "2.0"
         }
        }
       ],
       "outbound": [
        {
         "interface": ":33033",
         "service": "database"
        }
       ]
      }
     },
     "dataplaneInsight": {
      "subscriptions": [
       {
        "id": "426fe0d8-f667-11e9-b081-acde48001122",
        "controlPlaneInstanceId": "06070748-f667-11e9-b081-acde48001122",
        "connectTime": "2019-10-24T14:04:56.820350Z",
        "status": {
         "lastUpdateTime": "2019-10-24T14:04:57.832482Z",
         "total": {
          "responsesSent": "3",
          "responsesAcknowledged": "3"
         },
         "cds": {
          "responsesSent": "1",
          "responsesAcknowledged": "1"
         },
         "eds": {
          "responsesSent": "1",
          "responsesAcknowledged": "1"
         },
         "lds": {
          "responsesSent": "1",
          "responsesAcknowledged": "1"
         },
         "rds": {}
        }
       }
      ]
     }
    }
  ]
}
```

### Proxy Template

#### Get Proxy Template
Request: `GET /meshes/{mesh}/proxytemplates/{name}`

Response: `200 OK` with Proxy Template entity

Example:
```bash
curl http://localhost:5681/meshes/mesh-1/proxytemplates/pt-1
```
```json
{
  "type": "ProxyTemplate",
  "name": "pt-1",
  "mesh": "mesh-1",
  "selectors": [
    {
      "match": {
          "app": "backend"
      }
    }
  ],
  "imports": [
    "default-proxy"
  ],
  "resources": [
    {
      "name": "raw-name",
      "version": "raw-version",
      "resource": "'@type': type.googleapis.com/envoy.api.v2.Cluster\nconnectTimeout: 5s\nloadAssignment:\n  clusterName: localhost:8443\n  endpoints:\n    - lbEndpoints:\n        - endpoint:\n            address:\n              socketAddress:\n                address: 127.0.0.1\n                portValue: 8443\nname: localhost:8443\ntype: STATIC\n"
    }
  ]
}
```

#### Create/Update Proxy Template
Request: `PUT /meshes/{mesh}/proxytemplates/{name}` with Proxy Template entity in body

Response: `201 Created` when the resource is created and `200 OK` when it is updated

Example:
```bash
curl -XPUT http://localhost:5681/meshes/mesh-1/proxytemplates/pt-1 --data @proxytemplate.json -H'content-type: application/json'
```
```json
{
  "type": "ProxyTemplate",
  "name": "pt-1",
  "mesh": "mesh-1",
  "selectors": [
    {
      "match": {
          "app": "backend"
      }
    }
  ],
  "imports": [
    "default-proxy"
  ],
  "resources": [
    {
      "name": "raw-name",
      "version": "raw-version",
      "resource": "'@type': type.googleapis.com/envoy.api.v2.Cluster\nconnectTimeout: 5s\nloadAssignment:\n  clusterName: localhost:8443\n  endpoints:\n    - lbEndpoints:\n        - endpoint:\n            address:\n              socketAddress:\n                address: 127.0.0.1\n                portValue: 8443\nname: localhost:8443\ntype: STATIC\n"
    }
  ]
}
```

#### List Proxy Templates
Request: `GET /meshes/{mesh}/proxytemplates`

Response: `200 OK` with body of Proxy Template entities

Example:
```bash
curl http://localhost:5681/meshes/mesh-1/proxytemplates
```
```json
{
  "items": [
    {
      "type": "ProxyTemplate",
      "name": "pt-1",
      "mesh": "mesh-1",
      "selectors": [
        {
          "match": {
              "app": "backend"
          }
        }
      ],
      "imports": [
        "default-proxy"
      ],
      "resources": [
        {
          "name": "raw-name",
          "version": "raw-version",
          "resource": "'@type': type.googleapis.com/envoy.api.v2.Cluster\nconnectTimeout: 5s\nloadAssignment:\n  clusterName: localhost:8443\n  endpoints:\n    - lbEndpoints:\n        - endpoint:\n            address:\n              socketAddress:\n                address: 127.0.0.1\n                portValue: 8443\nname: localhost:8443\ntype: STATIC\n"
        }
      ]
    }
  ]
}
```

#### Delete Proxy Template
Request: `DELETE /meshes/{mesh}/proxytemplates/{name}`

Response: `200 OK`

Example:
```bash
curl -XDELETE http://localhost:5681/meshes/mesh-1/proxytemplates/pt-1
```

### Traffic Permission

#### Get Traffic Permission
Request: `GET /meshes/{mesh}/traffic-permissions/{name}`

Response: `200 OK` with Traffic Permission entity

Example:
```bash
curl http://localhost:5681/meshes/mesh-1/traffic-permissions/tp-1
```
```json
{
  "type": "TrafficPermission",
  "name": "tp-1",
  "mesh": "mesh-1",
  "rules": [
    {
      "sources": [
        {
          "match": {
            "service": "web"
          }
        }
      ],
      "destinations": [
        {
          "match": {
            "service": "backend"
          }
        }
      ]
    },
    {
      "sources": [
        {
          "match": {
            "service": "backend",
            "version": "1"
          }
        }
      ],
      "destinations": [
        {
          "match": {
            "service": "redis",
            "version": "1"
          }
        }
      ]
    },
    {
      "sources": [
        {
          "match": {
            "service": "backend",
            "version": "2"
          }
        }
      ],
      "destinations": [
        {
          "match": {
            "service": "redis",
            "version": "2"
          }
        }
      ]
    }
  ]
}
```

#### Create/Update Traffic Permission
Request: `PUT /meshes/{mesh}/trafficpermissions/{name}` with Traffic Permission entity in body

Response: `201 Created` when the resource is created and `200 OK` when it is updated

Example:
```bash
curl -XPUT http://localhost:5681/meshes/mesh-1/traffic-permissions/tp-1 --data @trafficpermission.json -H'content-type: application/json'
```
```json
{
  "type": "TrafficPermission",
  "name": "tp-1",
  "mesh": "mesh-1",
  "rules": [
    {
      "sources": [
        {
          "match": {
            "service": "web"
          }
        }
      ],
      "destinations": [
        {
          "match": {
            "service": "backend"
          }
        }
      ]
    },
    {
      "sources": [
        {
          "match": {
            "service": "backend",
            "version": "1"
          }
        }
      ],
      "destinations": [
        {
          "match": {
            "service": "redis",
            "version": "1"
          }
        }
      ]
    },
    {
      "sources": [
        {
          "match": {
            "service": "backend",
            "version": "2"
          }
        }
      ],
      "destinations": [
        {
          "match": {
            "service": "redis",
            "version": "2"
          }
        }
      ]
    }
  ]
}
```

#### List Traffic Permissions
Request: `GET /meshes/{mesh}/traffic-permissions`

Response: `200 OK` with body of Traffic Permission entities

Example:
```bash
curl http://localhost:5681/meshes/mesh-1/traffic-permissions
```
```json
{
  "items": [
    {
      "type": "TrafficPermission",
      "name": "tp-1",
      "mesh": "mesh-1",
      "rules": [
        {
          "sources": [
            {
              "match": {
                "service": "web"
              }
            }
          ],
          "destinations": [
            {
              "match": {
                "service": "backend"
              }
            }
          ]
        },
        {
          "sources": [
            {
              "match": {
                "service": "backend",
                "version": "1"
              }
            }
          ],
          "destinations": [
            {
              "match": {
                "service": "redis",
                "version": "1"
              }
            }
          ]
        },
        {
          "sources": [
            {
              "match": {
                "service": "backend",
                "version": "2"
              }
            }
          ],
          "destinations": [
            {
              "match": {
                "service": "redis",
                "version": "2"
              }
            }
          ]
        }
      ]
    }
  ]
}
```

#### Delete Traffic Permission
Request: `DELETE /meshes/{mesh}/traffic-permissions/{name}`

Response: `200 OK`

Example:
```bash
curl -XDELETE http://localhost:5681/meshes/mesh-1/traffic-permissions/pt-1
```

### Traffic Log

#### Get Traffic Log
Request: `GET /meshes/{mesh}/traffic-logs/{name}`

Response: `200 OK` with Traffic Log entity

Example:
```bash
curl http://localhost:5681/meshes/mesh-1/traffic-logs/tl-1
```
```json
{
  "type": "TrafficLog",
  "mesh": "mesh-1",
  "name": "tl-1",
  "rules": [
    {
      "sources": [
        {
          "match": {
            "service": "web",
            "version": "1.0"
          }
        }
      ],
      "destinations": [
        {
          "match": {
            "env": "dev",
            "service": "backend"
          }
        }
      ],
      "conf": {
        "backend": "file"
      }
    },
    {
      "sources": [
        {
          "match": {
            "service": "backend"
          }
        }
      ],
      "destinations": [
        {
          "match": {
            "service": "redis"
          }
        }
      ]
    }
  ]
}
```

#### Create/Update Traffic Log
Request: `PUT /meshes/{mesh}/traffic-logs/{name}` with Traffic Log entity in body

Response: `201 Created` when the resource is created and `200 OK` when it is updated

Example:
```bash
curl -XPUT http://localhost:5681/meshes/mesh-1/traffic-logs/tl-1 --data @trafficlog.json -H'content-type: application/json'
```
```json
{
  "type": "TrafficLog",
  "mesh": "mesh-1",
  "name": "tl-1",
  "rules": [
    {
      "sources": [
        {
          "match": {
            "service": "web",
            "version": "1.0"
          }
        }
      ],
      "destinations": [
        {
          "match": {
            "env": "dev",
            "service": "backend"
          }
        }
      ],
      "conf": {
        "backend": "file"
      }
    },
    {
      "sources": [
        {
          "match": {
            "service": "backend"
          }
        }
      ],
      "destinations": [
        {
          "match": {
            "service": "redis"
          }
        }
      ]
    }
  ]
}
```

#### List Traffic Logs
Request: `GET /meshes/{mesh}/traffic-logs`

Response: `200 OK` with body of Traffic Log entities

Example:
```bash
curl http://localhost:5681/meshes/mesh-1/traffic-logs
```
```json
{
  "items": [
    {
      "type": "TrafficLog",
      "mesh": "mesh-1",
      "name": "tl-1",
      "rules": [
        {
          "sources": [
            {
              "match": {
                "service": "web",
                "version": "1.0"
              }
            }
          ],
          "destinations": [
            {
              "match": {
                "env": "dev",
                "service": "backend"
              }
            }
          ],
          "conf": {
            "backend": "file"
          }
        },
        {
          "sources": [
            {
              "match": {
                "service": "backend"
              }
            }
          ],
          "destinations": [
            {
              "match": {
                "service": "redis"
              }
            }
          ]
        }
      ]
    }
  ]
}
```

#### Delete Traffic Log
Request: `DELETE /meshes/{mesh}/traffic-logs/{name}`

Response: `200 OK`

Example:
```bash
curl -XDELETE http://localhost:5681/meshes/mesh-1/traffic-logs/tl-1
```

::: tip
The [`kumactl`](/kumactl) CLI under the hood makes HTTP requests to this API.
:::

## Security

Kuma helps you secure your current infrastructure with mTLS. The following sections cover details of how it works.

### Certificates

Kuma uses a built-in CA (Certificate Authority) to issue certificates for dataplanes. The root certificate is unique for each mesh
in the system. On Kubernetes, the root certificate is stored as a [Kubernetes Secret](https://kubernetes.io/docs/concepts/configuration/secret/).
On Universal, we leverage the same storage (Postgres) that is used for storing policies. Certificates for dataplanes are stored
only in memory and certificates are generated each time the dataplane connects to the new control plane instance.

Dataplane certificates generated by Kuma are X.509 certificates that are [SPIFFE](https://github.com/spiffe/spiffe/blob/master/standards/X509-SVID.md) compliant. The SAN of certificate is set to `spiffe://<mesh name>/<service name>`

Currently, Kuma only supports self-signed root certificates (`builtin`). In the future, we plan to add support for third-party Certificate Authorities.

### Dataplane Token

To establish a connection between a dataplane and the server that provides certificates ([SDS](https://www.envoyproxy.io/docs/envoy/latest/configuration/security/secret) built-in in the control plane) the dataplane has to prove its identity.

#### Kubernetes
On Kubernetes deployments, the process is automated by leveraging [ServiceAccountToken](https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/#service-account-automation) that is mounted in every pod.

#### Universal

On Universal deployments, you have to generate a token before starting a dataplane. Dataplane Token is a [JWT tokens](https://jwt.io) that contains the _name_ and _mesh_ of the dataplane.
It is signed by RSA private key generated on the first run of the control plane. Tokens are not stored in the control plane,
the only thing that is stored is a private key that is used to verify if a token is valid. 

You can generate token either by REST API
```bash
curl -XPOST http://localhost:5679/tokens --data '{"name:" "dp-echo-1", "mesh": "default"}'
```

or by using `kumactl`
```bash
kumactl generate dataplane-token --name=dp-echo-1 --mesh=default > /tmp/kuma-dp-echo1-token
``` 

The token should be stored in a file and then used when starting `kuma-dp`
```bash
$ kuma-dp run \
  --name=dp-echo-1 \
  --mesh=default \
  --cp-address=http://127.0.0.1:5682 \
  --dataplane-token-file=/tmp/kuma-dp-echo-1-token
```

##### Accessing Dataplane Token Server from a different machine

By default, the Dataplane Token Server is exposed only on localhost. If you want to generate tokens from a different machine than control plane you have to secure the connection:
1) Enable public server by setting `KUMA_DATAPLANE_TOKEN_SERVER_PUBLIC_ENABLED` to `true`. Make sure to specify hostname which can be used to access Kuma from other machine via `KUMA_GENERAL_ADVERTISED_HOSTNAME`.
2) Generate certificate for the HTTPS Dataplane Token Server and set via `KUMA_DATAPLANE_TOKEN_SERVER_PUBLIC_TLS_CERT_FILE` and `KUMA_DATAPLANE_TOKEN_SERVER_PUBLIC_TLS_KEY_FILE` config environment variable.
   For generating self signed certificate you can use `kumactl`
```bash
$ kumactl generate certificate --cert=/path/to/cert --key/path/to/key --type=server 
```
3) Pick a public interface on which HTTPS server will be exposed and set it via `KUMA_DATAPLANE_TOKEN_SERVER_PUBLIC_INTERFACE`.
   Optionally pick the port via `KUMA_DATAPLANE_TOKEN_SERVER_PUBLIC_PORT`. By default, it will be the same as the port for the HTTP server exposed on localhost.
4) Generate one or more certificates for the clients of this server. Pass the path to the directory with client certificates via `KUMA_DATAPLANE_TOKEN_SERVER_PUBLIC_CLIENT_CERTS_DIR`.
   For generating self signed client certificates you can use `kumactl`
```bash
$ kumactl generate certificate --cert=/path/to/cert --key/path/to/key --type=client
```
5) Configure `kumactl` with client certificate.
```bash
$ kumactl config control-planes add \
  --name <NAME> --address http://<KUMA_CP_DNS_NAME>:5681 \
  --dataplane-token-client-cert <CERT.PEM> \
  --dataplane-token-client-key <KEY.PEM>
```

### mTLS

Once the connection between the dataplane and SDS server is established, the dataplane can now fetch its certificate
and root CA of the mesh. When establishing a connection between two dataplanes each side validates each other dataplane
certificate confirming the identity using the root CA of the mesh.

mTLS is _not_ enabled by default. To enable it, apply proper settings in [Mesh](/docs/DRAFT/policies/#mesh) policy.
Additionaly, when running on Universal you have to ensure that every dataplane in the mesh has been configured with a Dataplane Token.

#### TrafficPermission
When mTLS is enabled, every connection between dataplanes is denied by default, so you have to explicitly allow it using [TrafficPermission](/docs/DRAFT/policies/#traffic-permissions).

## Ports

When `kuma-cp` starts up, by default it listens on a few ports:

* `5677`: the SDS server being used for propagating mTLS certificates across the data-planes.
* `5678`: the xDS gRPC server implementation that the data-planes will use to retrieve their configuration.
* `5679`: the Dataplane Token Server that serves Dataplane Tokens
* `5680`: the HTTP server that returns the health status of the control-plane.
* `5681`: the HTTP API server that is being used by `kumactl`, and that you can also use to retrieve Kuma's policies and - when runnning in `universal` - that you can use to apply new policies.
* `5682`: the HTTP server that provides the Envoy bootstrap configuration when the data-plane starts up.

## Quickstart

The getting started for Kuma can be found in the [installation page](/install/DRAFT) where you can follow the instructions to get up and running with Kuma.

If you need help, you can chat with the [Community](/community) where you can ask questions, contribute back to Kuma and send feedback.
