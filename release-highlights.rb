#!/usr/bin/env ruby

require 'bundler'
require 'yaml'
require 'octokit'
require 'date'

last_release = Date.parse ARGV[0]

config = YAML.load(File.read('_config.yml'))

Octokit.auto_paginate = true

Octokit.configure do |c|
    c.access_token =  "ab7cecc74eac90ba78c28e6df7b3bbcb1e6b6ca1"
end

config['repos'].each do |repo|
    next unless repo["available"] 

    releases = Octokit.list_releases(repo["id"])

    puts "\n\n\n# #{repo['name']}"

    releases.each do |release|
        next if release.draft
        break if release.published_at.to_date < last_release

        puts release.body
    end
end

