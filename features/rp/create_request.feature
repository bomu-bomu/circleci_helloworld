Feature: RP's transaction

    @NoDataRequest
    Scenario: RP client create request
        Given The "IDP,RP,AS" platform is running
        And RP client making a request for create request
            """json
            {
            "reference_id":"Random Generate",
            "idp_list":[],
            "callback_url":"http://localhost:1070/rp/request/",
            "data_request_list":[],
            "request_message":"dummy Request Message",
            "min_ial":1.1,
            "min_aal":1,
            "min_idp":1,
            "request_timeout":259200
            }
            """
        When RP client make a POST request for create request to "/rp/requests/:namespace/:Identifier"
        Then The response status code should be "200"
        And The response property "request_id" is
        And RP client should receive request status "completed"

    @WithDataRequest
    Scenario: RP client create request
        Given The "IDP,RP" platform is running
        And RP client making a request for create request
            """json
            {
            "reference_id":"Random Generate",
            "idp_list":[],
            "callback_url":"http://localhost:1070/rp/request/",
            "data_request_list":[{
            "service_id": "bank_statement",
            "as_id_list": ["as1", "as2", "as3"],
            "count": 1,
            "request_params": { "format": "pdf" }
            }],
            "request_message":"dummy Request Message",
            "min_ial":1.1,
            "min_aal":1,
            "min_idp":1,
            "request_timeout":259200
            }
            """
        When RP client make a POST request for create request to "/rp/requests/:namespace/:Identifier"
        Then The response status code should be "200"
        And The response property "request_id" is
        And RP client should receive request status "confirmed"
        And RP client should receive request status "completed"
        And RP client should receive data requested
        # And RP client should receive request status "completed"

