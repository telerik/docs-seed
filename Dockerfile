FROM ruby:2.3.5

WORKDIR /app

ADD Gemfile /app
ADD Gemfile.lock /app
RUN bundle install

EXPOSE 4000

CMD jekyll serve -s /app -d /app/_site --host 0.0.0.0 --watch
