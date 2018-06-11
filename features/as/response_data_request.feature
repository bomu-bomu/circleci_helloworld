Feature: AS's transaction

    @ResponseDataRequest
    Scenario: AS client receive data request
        Given AS client should receive data request from platform
        When AS client response data request to platform