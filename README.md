# docs-seed repo
Contains the documentation site implementation.

## Prerequisites
- ruby >= 2.3.3
- bundler installed ('gem install bundler')

## Build Instructions
It is **mandatory** to add a step in the documentation build. You should execute the following bash/shell script:

```console
clone_path=".tmp"

rm -rf $clone_path/
mkdir $clone_path/

git clone -b master https://github.com/telerik/docs-seed.git $clone_path/ || exit 1

sh $clone_path/copy_content.sh || exit 1
sh $clone_path/install.sh || exit 1
# The config parameter is optional and by default it is _config.yml.
# However if you have same content, but with different configuration files, 
# you can pass it here (e.g. WPF/Silverlight docs)
sh $clone_path/build.sh '_config.yml' || exit 1
echo 'Complete.'
```
