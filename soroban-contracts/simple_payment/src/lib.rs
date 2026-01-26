#![no_std]
use soroban_sdk::{contract, contractimpl, token, Address, Env, String};

#[contract]
pub struct SimplePayment;

#[contractimpl]
impl SimplePayment {
    /// Constructor to initialize the payment contract
    /// 
    /// # Arguments
    /// * `native_asset_address` - The XLM native asset contract address for your network
    /// 
    /// # Note
    /// Stores the native asset address in contract storage for use by the send functions.
    /// 
    /// To get the XLM contract address for your network:
    /// ```bash
    /// soroban contract id asset --asset native --network <network>
    /// ```
    pub fn __constructor(e: &Env, native_asset_address: Address) {
        // Store the native asset address in contract storage
        // Note: Instance storage entries have TTL and may expire unless extended
        let native_asset_key = String::from_str(e, "native_asset");
        e.storage().instance().set(&native_asset_key, &native_asset_address);
    }

    /// Get the XLM native asset contract address from storage
    /// 
    /// Returns the native asset address that was set during contract initialization.
    fn get_native_asset_address(env: &Env) -> Address {
        let storage_key = String::from_str(env, "native_asset");
        env.storage()
            .instance()
            .get(&storage_key)
            .expect("Native asset address not initialized")
    }

    /// Send 0.1 XLM (1,000,000 stroops) from the contract to a recipient
    /// 
    /// # Arguments
    /// * `recipient` - The Stellar address to send 0.1 XLM to
    /// 
    /// # Returns
    /// Returns true on success
    /// 
    /// # Note
    /// Anyone can call this function. This function transfers 0.1 XLM (the native Stellar asset) 
    /// from the contract's balance to the recipient. The contract must have at least 0.1 XLM balance before calling this function.
    /// 
    /// The XLM native asset contract address is network-specific and can be obtained using:
    /// `soroban contract id asset --asset native --network <network>`
    pub fn send(env: Env, recipient: Address) -> bool {
        // Fixed amount: 0.1 XLM = 1,000,000 stroops
        const AMOUNT: i128 = 1_000_000;
        
        // Validate recipient address is not the contract itself
        let contract_address = env.current_contract_address();
        if recipient == contract_address {
            panic!("Cannot send to contract address");
        }
        
        // Get the native asset contract address
        // The native asset (XLM) contract address is network-specific.
        // You can get it using: soroban contract id asset --asset native --network <network>
        let native_asset_address = Self::get_native_asset_address(&env);
        let native_token = token::Client::new(&env, &native_asset_address);
        let contract_address = env.current_contract_address();
        
        // Check contract balance before transfer
        let contract_balance = native_token.balance(&contract_address);
        if contract_balance < AMOUNT {
            panic!("Insufficient balance: contract has {} stroops ({} XLM) but needs {} stroops (0.1 XLM)", 
                   contract_balance, contract_balance / 10_000_000, AMOUNT);
        }
        
        // Transfer 0.1 XLM from the contract to the recipient
        native_token.transfer(&contract_address, &recipient, &AMOUNT);
        
        true
    }
    

    /// Alternative function name: transfer
    /// Same functionality as send()
    pub fn transfer(env: Env, recipient: Address) -> bool {
        Self::send(env, recipient)
    }

    /// Alternative function name: pay
    /// Same functionality as send()
    pub fn pay(env: Env, recipient: Address) -> bool {
        Self::send(env, recipient)
    }
}

#[cfg(test)]
mod test;
