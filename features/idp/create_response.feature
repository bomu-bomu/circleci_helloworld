Feature: IDP's transaction

    @SetCallback
    Scenario: IDP client set callback url
        Given The "IDP,RP,AS" platform is running
        And IDP client making a request for set callback url
            """json
                {
                "url":"http://localhost:1080/idp/request"
                }
            """
        When IDP client make a POST request for "set callback url" to "/idp/callback"
        Then The response status code should be "204"
    
    @SetCallback
    Scenario: IDP client set accessor callback url
        Given IDP client making a request for set accessor callback url
            """json
                {
                "url":"http://localhost:1080/idp/accessor"
                }
            """
        When IDP client make a POST request for "set accessor callback url" to "/idp/accessor/callback"
        Then The response status code should be "204"

    @CreateIdentity
    Scenario: IDP client create new identity
        Given IDP client making a request for create new identity
            """json
            {
            "namespace":"cid",
            "identifier":"1234",
            "reference_id": "Random Generate",
            "accessor_type":"awesome-type",
            "accessor_public_key":"awsome-key",
            "accessor_id":"some-awesome-accessor-for-sid-with-nonce",
            "ial":2.3
            }
            """
        When IDP client make a POST request for create new identity to "/identity"
        Then The response status code should be "200"
        And The response for create new identity
    
    # @AlreadyCreateidentity
    # Scenario: IDP client create new identity
    #     Given IDP client making a request for create new identity
    #         """json
    #         {
    #         "namespace":"cid",
    #         "identifier":"1234",
    #         "accessor_type":"awesome-type",
    #         "accessor_public_key":"awsome-key",
    #         "accessor_id":"some-awesome-accessor-for-sid",
    #         "accessor_group_id": "not-so-awesome-group-id-for-sid",
    #         "ial":2.3
    #         }
    #         """
    #     When IDP client make a POST request for "create new identity" to "/identity"
    #     Then The response status code should be "500"
    
    @CreateResponse
    Scenario: IDP client create response
        Given IDP client should receive request from IDP platform
        And IDP client making a request for create response
            """json
            {
            "status":"accept",
            "request_id":"Request ID from request",
            "namespace":"Namespace from request",
            "identifier":"Identifier from request",
            "ial": 3,
            "aal": 3,
            "secret": "Some secret",
            "signature": "Some signature",
            "accessor_id": "Some accessor_id"
            }
            """
        When IDP client make a POST request for "create response" to "/idp/response"
        Then The response status code should be "204"
    
    @ResponseFromConsentOnboard
    Scenario: IDP client receive response from consent for onboard
        Given IDP client should receive response from consent for onboard
        Then The response property "success" should be "true"