using System;
using System.IO;
using System.Xml;

namespace RemoveHtmlExtensionFromApiRefSitemap
{
    class Program
    {
        static void Main(string[] args)
        {
            string[] arguments = Environment.GetCommandLineArgs();
            
            if(arguments.Length < 2)
            {
                throw new ArgumentNullException("You must provide a path to the drop folder of the API reference so we can alter the sitemap.xml file in it.");
            }
                        
            string pathToApiRefSitemap = Path.Combine(arguments[1], "sitemap.xml");
            
            if (!File.Exists(pathToApiRefSitemap))
            {
                throw new FileNotFoundException("API Ref sitemap file not found in the target folder");
            }
            
            string sitemapText = File.ReadAllText(pathToApiRefSitemap);
            sitemapText = sitemapText.Replace(".html</loc>", "</loc>");
            File.WriteAllText(pathToApiRefSitemap, sitemapText);
        }
    }
}
