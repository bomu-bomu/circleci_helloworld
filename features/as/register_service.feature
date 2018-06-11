Feature: AS's transaction

    @RegisterService
    Scenario: AS client register service
        Given The "IDP,RP,AS" platform is running
        And AS client making a request for register service
            """json
            {
            "service_id": "bank_statement",
            "service_name": "Bank statement description",
            "min_ial": 1.1,
            "min_aal": 1
            }
            """
        When AS client make a POST request for "register service" to "/as/service/bank_statement"
        Then The response status code should be "201"