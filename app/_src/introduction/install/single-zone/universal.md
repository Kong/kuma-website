---
title: Install single-zone on Universal
content_type: how-to
---

This is a simple guide on how to install {{site.mesh_product_name}} on your machine.

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
3. Run {{site.mesh_product_name}} control plane
```shell
kuma-cp run
```
4. To verify installation open [GUI](/docs/{{ page.version }}/production/gui) in your browser by navigating to [127.0.0.1:5681/gui](http://127.0.0.1:5681/gui)

{% tip %}
If you only need `kumactl` on macOS you can install it via `brew install kumactl`.
{% endtip %}


## Next steps
* [Complete quickstart](/docs/{{ page.version }}/quickstart/universal-demo/) to install demo application and secure traffic
* Read more about [single-zone setup](/docs/{{ page.version }}/production/deployment/single-zone/)
