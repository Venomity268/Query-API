import { Block } from "@near-lake/primitives";
/**
 * Note: We only support javascript at the moment. We will support Rust, Typescript in a further release.
 */

/**
 * getBlock(block, context) applies your custom logic to a Block on Near and commits the data to a database.
 *
 * Learn more about indexers here:  https://docs.near.org/concepts/advanced/indexers
 *
 * @param {block} Block - A Near Protocol Block
 * @param {context} - A set of helper methods to retrieve and commit state
 */
async function getBlock(block: Block, context) {
  // Function to decode base64 encoded data
  function base64decode(encodedValue) {
    let buff = Buffer.from(encodedValue, "base64");
    return JSON.parse(buff.toString("utf-8"));
  }

  // The contract account ID
  const PIXELTOKEN_DB = "pixelparty.near";

  // Filter the block's actions to get the function calls to the PIXELTOKEN_DB contract
  const pixelTokenTxs = block
    .actions()
    .filter((action) => action.receiverId === PIXELTOKEN_DB)
    .flatMap((action) =>
      action.operations
        .map((operation) => operation["FunctionCall"])
        // Filter the function calls to get the ones that call the "load_frame_data" method
        .filter((operation) => operation?.methodName === "load_frame_data")
        .map((functionCallOperation) => ({
          ...functionCallOperation,
          args: base64decode(functionCallOperation.args),
          receiptId: action.receiptId, // providing receiptId as we need it
        }))
    );

  // If there are any function calls to "load_frame_data", handle them
  if (pixelTokenTxs.length > 0) {
    console.log("Found PixelToken Transactions in Block...");
    const blockHeight = block.blockHeight;
    const blockTimestamp = block.header().timestampNanosec;
    await Promise.all(
      pixelTokenTxs.map(async (tx) => {
        const frameData = tx.args;
        // Store frame data in database
        await handleFrameDataRetrieval(
          tx.signerId,
          blockHeight,
          blockTimestamp,
          tx.receiptId,
          frameData,
          context
        );
      })
    );
  }
}

async function handleFrameDataRetrieval(
  accountId,
  blockHeight,
  blockTimestamp,
  receiptId,
  frameDataWrapper,
  context
) {
  // Loop through the frame data and metadata arrays
  for (let i = 0; i < frameDataWrapper.data.length; i++) {
    const frameData = frameDataWrapper.data[i];
    const frameMetadata = frameDataWrapper.metadata[i];

    const mutationData = {
      frame: {
        account_id: accountId,
        block_height: blockHeight,
        block_timestamp: blockTimestamp,
        frame_data: frameData,
        frame_metadata: frameMetadata,
        receipt_id: receiptId,
      },
    };

    // Call GraphQL mutation to insert the frame data
    const mutation = `mutation storeFrameData($frame: dataplatform_near_pixelparty_frames_insert_input!){
      insert_dataplatform_near_pixelparty_frames_one(
        object: $frame
      ) {
        account_id
        block_height
      }
    }`;
    await context.graphql(mutation, mutationData);

    console.log(
      `Frame data for frame ${i} by ${accountId} has been added to the database`
    );
  }
}