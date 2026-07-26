# frozen_string_literal: true

require_relative "test_helper"

class HttpServerTest < Minitest::Test
  Request = Struct.new(:origin) do
    def [](name)
      origin if name == "Origin"
    end
  end

  def setup
    @servlet = RailsMarkup::CorsServlet.allocate
  end

  def test_cors_reflects_allowed_loopback_request_origins
    [
      "http://localhost:3000",
      "https://localhost:3443",
      "http://127.0.0.1:3000",
      "http://127.42.0.9:9292",
      "http://[::1]:3000"
    ].each do |origin|
      response = {}

      @servlet.send(:cors, Request.new(origin), response)

      assert_equal origin, response["Access-Control-Allow-Origin"]
    end
  end

  def test_cors_does_not_allow_non_loopback_or_malformed_origins
    [
      "https://example.com",
      "http://192.168.1.10:3000",
      "javascript:alert(1)",
      "http://localhost:3000/path",
      nil
    ].each do |origin|
      response = {}

      @servlet.send(:cors, Request.new(origin), response)

      refute response.key?("Access-Control-Allow-Origin")
    end
  end
end
