Feature: CupBear demo happy path
  As a visitor
  I want to preview a remote file safely
  So that I can download only a safe copy

  Scenario: URL → Preview → Safe copy
    Given I open the demo page
    And I see the input for a URL
    When I paste "https://example.com/sample.pdf" and press Start
    Then I should see "Step 1: Verification passed"
    And within 2 seconds I should see the remote viewer frame
    When I click "Create Safe Copy"
    Then a download link appears with TTL "5 minutes"
    And the original file is not stored (verified by audit API)
