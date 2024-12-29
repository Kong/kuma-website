module Jekyll
  module KumaPlugins
    class Generator < Jekyll::Generator
      priority :lowest

      def generate(site)
        demo_version = site.config.fetch('mesh_demo_version', 'main')
        site.pages.each do |page|
          page.content = page.content.gsub("kuma-demo://", "https://raw.githubusercontent.com/kumahq/kuma-counter-demo/refs/heads/#{demo_version}/")
        end
      end
    end
  end
end
