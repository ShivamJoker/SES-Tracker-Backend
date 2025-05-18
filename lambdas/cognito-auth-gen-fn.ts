import { PreTokenGenerationV2TriggerEvent } from "aws-lambda";

export const handler = async (e: PreTokenGenerationV2TriggerEvent) => {
  console.log(e);

  e.response = {
    claimsAndScopeOverrideDetails: {
      accessTokenGeneration: {
        claimsToAddOrOverride: {
          test: "test2",
        },
        scopesToAdd: ["test2"],
      },
      idTokenGeneration: {
        claimsToAddOrOverride: {
          aws_account_id: "my-aws-account-id",
        },
      },
    },
  };
  return e;
};
