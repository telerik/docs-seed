FROM ruby:2.3.5

ENV APP_ROOT /app_root

# By adding Gemfiles and invoke bundle install before copy all files we are using container cache for gems.
ADD Gemfile ${APP_ROOT}/
ADD Gemfile.lock ${APP_ROOT}/

WORKDIR ${APP_ROOT}
RUN bundle check || bundle install

COPY . ${APP_ROOT}

EXPOSE 4000
CMD bundle exec jekyll serve --watch --incremental --host 0.0.0.0
