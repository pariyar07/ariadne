#!/usr/bin/env ruby
# frozen_string_literal: true

require "yaml"
require "date"

vault = ARGV[0] || Dir.pwd
Dir.chdir(vault)

errors = []

markdown_files = Dir.glob("**/*.md", File::FNM_DOTMATCH)
                    .reject { |file| file.start_with?(".obsidian/") || file.include?("/.obsidian/") }
base_files = Dir.glob("Bases/*.base")
all_targets = markdown_files + base_files

all_targets.each do |file|
  next unless file.end_with?(".base")

  begin
    YAML.safe_load(File.read(file), permitted_classes: [Date, Time], aliases: true)
  rescue StandardError => e
    errors << "#{file}: #{e.class}: #{e.message}"
  end
end

markdown_files.each do |file|
  text = File.read(file)
  next unless text.start_with?("---\n")

  frontmatter = text.split(/^---\s*$/, 3)[1]
  begin
    YAML.safe_load(frontmatter, permitted_classes: [Date, Time], aliases: true)
  rescue StandardError => e
    errors << "#{file}: #{e.class}: #{e.message}"
  end
end

targets = {}
all_targets.each do |file|
  no_ext = file.sub(/\.(md|base)$/, "")
  targets[file] = file
  targets[no_ext] = file
  targets[File.basename(file)] = file
  targets[File.basename(no_ext)] = file
end

incoming = Hash.new(0)
outgoing = Hash.new(0)
broken = []

markdown_files.each do |file|
  File.read(file).scan(/!??\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]*)?\]\]/).flatten.each do |raw_target|
    target = raw_target.strip
    next if target.empty?

    outgoing[file] += 1
    if targets.key?(target)
      incoming[targets[target]] += 1
    else
      broken << "#{file} -> [[#{target}]]"
    end
  end
end

true_orphans = markdown_files.select do |file|
  incoming[file].zero? && outgoing[file].zero?
end

unlinked_bases = base_files.select { |file| incoming[file].zero? }

bloat_warnings = []

def line_count(file)
  File.readlines(file, chomp: true).length
end

def wikilink_count(file)
  File.read(file).scan(/!??\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]*)?\]\]/).length
end

if File.exist?("00 Index.md")
  lines = line_count("00 Index.md")
  links = wikilink_count("00 Index.md")
  if lines > 250 || links > 150
    bloat_warnings << "00 Index.md may be too large for a strategic map: #{lines} lines, #{links} wikilinks"
  end
end

agent_nav = "Agent/00 Agent Navigation.md"
if File.exist?(agent_nav)
  lines = line_count(agent_nav)
  links = wikilink_count(agent_nav)
  if lines > 200 || links > 100
    bloat_warnings << "#{agent_nav} may be too detailed for a routing map: #{lines} lines, #{links} wikilinks"
  end
end

directories = markdown_files.map { |file| File.dirname(file) }.uniq.reject { |dir| dir == "." }
directories.each do |dir|
  direct_notes = markdown_files.select { |file| File.dirname(file) == dir }
  has_hub = direct_notes.any? { |file| File.basename(file).match?(/^00 .*Index\.md$/) || File.basename(file) == "00 Index.md" }
  if direct_notes.length > 20 && !has_hub
    bloat_warnings << "#{dir}/ has #{direct_notes.length} Markdown notes and no 00 ... Index.md hub"
  end

  local_agents = File.join(dir, "AGENTS.md")
  next if File.exist?(local_agents)

  non_index_notes = direct_notes.reject { |file| File.basename(file).match?(/^00 .*Index\.md$/) }
  if non_index_notes.length > 30 && !%w[Raw Raw/Sources Templates Archive Outputs Bases].include?(dir)
    bloat_warnings << "#{dir}/ has #{non_index_notes.length} non-index notes and may need a local AGENTS.md if workflow rules are specialized"
  end
end

markdown_files.select { |file| File.basename(file).match?(/^00 .*Index\.md$/) || file == "00 Index.md" }.each do |hub|
  lines = line_count(hub)
  links = wikilink_count(hub)
  if lines > 300 || links > 175
    bloat_warnings << "#{hub} may need sub-hubs or a Base: #{lines} lines, #{links} wikilinks"
  end
end

if errors.empty?
  puts "yaml-ok"
else
  puts "yaml-errors: #{errors.length}"
  puts errors.sort
end

puts "broken-wikilinks: #{broken.length}"
puts broken.sort unless broken.empty?
puts "true-orphans-md: #{true_orphans.length}"
puts true_orphans.sort unless true_orphans.empty?
puts "unlinked-base-files: #{unlinked_bases.length}"
puts unlinked_bases.sort unless unlinked_bases.empty?
puts "bloat-warnings: #{bloat_warnings.length}"
puts bloat_warnings.sort unless bloat_warnings.empty?

exit(errors.empty? && broken.empty? && true_orphans.empty? && unlinked_bases.empty? ? 0 : 1)
