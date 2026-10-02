
Feature: Flipkart Shopping Cart

  Scenario: Search product, add product to cart, and verify cart
    Given I am on the Flipkart home page
    When I log in to Flipkart with my phone number
    When I search for the selected product
    And I add the selected product to the cart
    When I navigate to the cart
    Then the selected product should be displayed in the cart
