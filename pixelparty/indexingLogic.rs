use near_sdk::{env, ext_contract, near_bindgen};
use near_sdk::borsh::{self, BorshDeserialize, BorshSerialize};
use near_sdk::collections::Vector;

#[near_bindgen]
#[derive(BorshSerialize, BorshDeserialize)]
struct Contract {
    ownership_history: Vector<OwnershipRecord>,
}

#[derive(BorshSerialize, BorshDeserialize)]
struct OwnershipRecord {
    owner: String,
    frame_id: u64,
    timestamp: u64,
}

#[near_bindgen]
impl Contract {

    // Function to add ownership record
    pub fn add_ownership(&mut self, owner: String, frame_id: u64, timestamp: u64) {
        let ownership_record = OwnershipRecord {
            owner,
            frame_id,
            timestamp,
        };
        self.ownership_history.push(&ownership_record);
    }

    // Function to get ownership history for a specific account
    pub fn get_ownership_history(&self, account_id: String) -> Vec<OwnershipRecord> {
        self.ownership_history
            .iter()
            .filter(|record| record.owner == account_id)
            .cloned()
            .collect()
    }
}