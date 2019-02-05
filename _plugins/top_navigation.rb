require 'open-uri'

Jekyll::Hooks.register :site, :after_init do |site, payload|
  navigations_map = {
    "aspnet-ajax" => "asp-net-ajax", 
    "aspnet-core" => "asp-net-core",
    "aspnet-mvc" => "asp-net-mvc", 
    "dpl" => "document-processing", 
    "fiddler" => "fiddler", 
    "fiddler-everywhere" => "fiddler-everywhere", 
    "justdecompile" => "just-decompile", 
    "justmock" => "just-mock", 
    "kendo-ui" => "kendo-ui-jquery", 
    "reporting" => "reporting", 
    "report-server" => "report-server", 
    "silverlight" => "silverlight", 
    "teststudio" => "test-studio", 
    "teststudio-apis" => "api-testing", 
    "teststudiodev" => "test-studio-dev-edition", 
    "uwp" => "uwp", 
    "winforms" => "winforms", 
    "wpf" => "wpf", 
    "xamarin" => "xamarin" 
  }

  html = open("http://cdn.telerik-web-assets.com/telerik-navigation/next/nav-#{navigations_map[site.config['platform']]}-csa-abs-component.html").read

  File.write('./_includes/top-nav.html', html)
end
