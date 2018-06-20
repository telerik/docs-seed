FROM ruby:2.3.5

ENV app /app
WORKDIR ${app}

COPY . ${app}
RUN bundle install
EXPOSE 4000

CMD bundle exec jekyll serve --host 0.0.0.0 --watch
