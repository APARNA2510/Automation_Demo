
Feature: Flipkart Shopping Cart

  Scenario: Search product, skip unavailable results, and verify the first available product in the cart
    Given I am on the Flipkart home page
    When I open the login modal from the home page
    When I log in to Flipkart with my phone number
    When I search for the selected product
    Then matching products should be displayed
    And I add the first available product to the cart
    When I navigate to the cart
    Then the selected product should be displayed in the cart

  Scenario: Searching for an invalid product shows the no-results message
    Given I am on the Flipkart home page
    When I search for the invalid product
    Then the no-results message should appear

  Scenario: Invalid phone number displays a validation error
    Given I am on the Flipkart login page
    When I enter an invalid phone number "0000000000"
    Then the invalid phone number error should be displayed

  @otp-negative
  Scenario: Incorrect OTP displays a validation error
    Given I am on the Flipkart login page
    When I submit an incorrect OTP for the configured phone number
    Then the invalid OTP error should be displayed
