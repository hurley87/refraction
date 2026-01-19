#![no_std]
use soroban_sdk::{contract, contractimpl, token, Address, Env, String};

#[contract]
pub struct SimplePayment;

#[contractimpl]
impl SimplePayment {

    /// Send XLM (native Stellar asset) from the contract to a recipient
    /// 
    /// # Arguments
    /// * `recipient` - The Stellar address to send XLM to
    /// * `amount` - The amount in stroops (1 XLM = 10,000,000 stroops)
    /// 
    /// # Returns
    /// Returns true on success
    /// 
    /// # Note
    /// Anyone can call this function. This function transfers XLM (the native Stellar asset) 
    /// from the contract's balance to the recipient. The contract must have XLM balance before calling this function.
    /// 
    /// The XLM native asset contract address is network-specific and can be obtained using:
    /// `soroban contract id asset --asset native --network <network>`
    pub fn send(env: Env, recipient: Address, amount: i128) -> bool {
        // Validate recipient address is not the contract itself
        let contract_address = env.current_contract_address();
        if recipient == contract_address {
            panic!("Cannot send to contract address");
        }
        
        // Validate amount is positive
        if amount <= 0 {
            panic!("Amount must be positive, got: {}", amount);
        }
        
        // Get the native asset contract address
        // The native asset (XLM) contract address is network-specific.
        // You can get it using: soroban lab token id --asset native --network <network>
        let native_asset_address = Self::get_native_asset_address(&env);
        let native_token = token::Client::new(&env, &native_asset_address);
        let contract_address = env.current_contract_address();
        
        // Check contract balance before transfer
        let contract_balance = native_token.balance(&contract_address);
        if contract_balance == 0 {
            panic!("Contract has no XLM balance. The contract must be funded with XLM before it can send to recipients.");
        }
        if amount > contract_balance {
            panic!("Insufficient balance: requested {} stroops but contract has {} stroops ({} XLM)", amount, contract_balance, contract_balance / 10_000_000);
        }
        
        // Transfer XLM from the contract to the recipient
        native_token.transfer(&contract_address, &recipient, &amount);
        
        true
    }
    
    /// Alternative: Send XLM with explicit XLM contract address parameter
    /// 
    /// This version allows you to pass the XLM native asset contract address,
    /// making it work across different networks without hardcoding the address.
    /// 
    /// # Arguments
    /// * `native_asset_address` - The XLM native asset contract address for your network
    /// * `recipient` - The Stellar address to send XLM to
    /// * `amount` - The amount in stroops (1 XLM = 10,000,000 stroops)
    /// 
    /// # Returns
    /// Returns true on success
    /// 
    /// # Note
    /// Anyone can call this function.
    /// 
    /// # Example
    /// Get the XLM contract address first:
    /// ```bash
    /// soroban contract id asset --asset native --network futurenet
    /// ```
    /// Then pass that address when calling this function.
    pub fn send_with_native_address(
        env: Env,
        native_asset_address: Address,
        recipient: Address,
        amount: i128,
    ) -> bool {
        // Validate recipient address is not the contract itself
        let contract_address = env.current_contract_address();
        if recipient == contract_address {
            panic!("Cannot send to contract address");
        }
        
        // Validate native_asset_address is not the contract itself
        if native_asset_address == contract_address {
            panic!("Native asset address cannot be the contract address");
        }
        
        // Validate amount is positive
        if amount <= 0 {
            panic!("Amount must be positive, got: {}", amount);
        }
        
        let native_token = token::Client::new(&env, &native_asset_address);
        let contract_address = env.current_contract_address();
        
        // Check contract balance before transfer
        let contract_balance = native_token.balance(&contract_address);
        if contract_balance == 0 {
            panic!("Contract has no XLM balance. The contract must be funded with XLM before it can send to recipients.");
        }
        if amount > contract_balance {
            panic!("Insufficient balance: requested {} stroops but contract has {} stroops ({} XLM)", amount, contract_balance, contract_balance / 10_000_000);
        }
        
        native_token.transfer(&contract_address, &recipient, &amount);
        
        true
    }
    
    /// Get the XLM native asset contract address
    /// 
    /// In Soroban, XLM (the native Stellar asset) has a contract address that is network-specific.
    /// You can get the XLM contract address using: `soroban contract id asset --asset native --network <network>`
    /// 
    /// **IMPORTANT:** Replace the placeholder address below with the actual XLM contract address
    /// for your target network. The address below is for Testnet - update it for your network.
    /// 
    /// For production use, consider using `send_with_native_address()` instead,
    /// which allows passing the XLM contract address as a parameter, making your contract
    /// work across different networks without code changes.
    fn get_native_asset_address(env: &Env) -> Address {
        // TODO: Replace this with the actual XLM native asset contract address for your target network.
        // Get it using: soroban contract id asset --asset native --network <network>
        // 
        // Example commands:
        // - Testnet: soroban contract id asset --asset native --network testnet
        // - Futurenet: soroban contract id asset --asset native --network futurenet
        // - Mainnet: soroban contract id asset --asset native --network mainnet
        // 
        // Current address below is for Testnet (update for your network):
        let native_asset_str = String::from_str(env, "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC");
        Address::from_string(&native_asset_str)
    }

    /// Alternative function name: transfer
    /// Same functionality as send()
    pub fn transfer(env: Env, recipient: Address, amount: i128) -> bool {
        Self::send(env, recipient, amount)
    }

    /// Alternative function name: pay
    /// Same functionality as send()
    pub fn pay(env: Env, recipient: Address, amount: i128) -> bool {
        Self::send(env, recipient, amount)
    }
}

#[cfg(test)]
mod test;
