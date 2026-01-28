#![no_std]
use soroban_sdk::{contract, contractimpl, token, Address, Env, String};
use stellar_access::ownable::{self as ownable, Ownable};
use stellar_tokens::non_fungible::{
    burnable::NonFungibleBurnable, Base, NonFungibleToken,
};

#[contract]
pub struct NonFungibleTokenContract;

#[contractimpl]
impl NonFungibleTokenContract {
    /// Constructor to initialize the NFT contract
    /// 
    /// # Arguments
    /// * `owner` - The address that will own the contract (for administrative purposes)
    /// * `native_asset_address` - The XLM native asset contract address for your network
    /// * `max_supply` - Maximum number of NFTs that can be minted (0 = unlimited)
    /// 
    /// # Note
    /// Sets the contract metadata (name, symbol, URI) and assigns the owner.
    /// The owner can be used for future administrative functions, but any user can mint NFTs.
    /// 
    /// To get the XLM contract address for your network:
    /// ```bash
    /// soroban contract id asset --asset native --network <network>
    /// ```
    pub fn __constructor(e: &Env, owner: Address, native_asset_address: Address, max_supply: u32) {
        // Set token metadata
        Base::set_metadata(
            e,
            String::from_str(e, "ipfs://bafkreigyr5cezc5v7eug4nad7jolyvvp3szwm2oh3njxbeqxozj66zbwdm"),
            String::from_str(e, "IRL Test Collection"),
            String::from_str(e, "IRL001"),
        );

        // Set the contract owner
        ownable::set_owner(e, &owner);
        
        // Store the native asset address in contract storage
        // Note: Instance storage entries have TTL and may expire unless extended
        let native_asset_key = String::from_str(e, "native_asset");
        e.storage().instance().set(&native_asset_key, &native_asset_address);
        
        // Store the max supply in contract storage
        // Note: Instance storage entries have TTL and may expire unless extended
        let max_supply_key = String::from_str(e, "max_supply");
        e.storage().instance().set(&max_supply_key, &max_supply);
        
        // Initialize supply counter to 0
        // Note: Instance storage entries have TTL and may expire unless extended
        let supply_key = String::from_str(e, "supply");
        e.storage().instance().set(&supply_key, &0u32);
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

    /// Get the maximum supply from storage
    /// 
    /// Returns the maximum supply that was set during contract initialization.
    /// Returns 0 if unlimited.
    fn get_max_supply(env: &Env) -> u32 {
        let storage_key = String::from_str(env, "max_supply");
        env.storage()
            .instance()
            .get(&storage_key)
            .unwrap_or(0) // Default to 0 (unlimited) if not set
    }

    /// Get the current supply from storage
    /// 
    /// Returns the current number of minted NFTs.
    fn get_current_supply(env: &Env) -> u32 {
        let storage_key = String::from_str(env, "supply");
        env.storage()
            .instance()
            .get(&storage_key)
            .unwrap_or(0) // Default to 0 if not set
    }

    /// Increment the supply counter
    fn increment_supply(env: &Env) {
        let current = Self::get_current_supply(env);
        let storage_key = String::from_str(env, "supply");
        env.storage().instance().set(&storage_key, &(current + 1));
    }

    /// Mint a new NFT to the specified address
    /// 
    /// # Arguments
    /// * `to` - The address that will receive the newly minted NFT
    /// 
    /// # Returns
    /// Returns the token ID of the newly minted NFT (sequential, starting from 1)
    /// 
    /// # Note
    /// Any user can mint NFTs. The function automatically transfers 0.1 XLM (1,000,000 stroops)
    /// from the recipient (`to`) to the contract as payment. The recipient must have sufficient XLM balance
    /// and must authorize the transaction (sign it).
    /// 
    /// If minting fails after payment, the payment will be refunded to the recipient.
    /// In Soroban, if sequential_mint panics, the entire transaction reverts,
    /// so the payment transfer will also be reverted automatically. No explicit refund needed.
    pub fn mint(env: Env, to: Address) -> u32 {
        // Validate recipient address is not the contract itself (prevents self-minting issues)
        let contract_address = env.current_contract_address();
        if to == contract_address {
            panic!("Cannot mint to contract address");
        }
        
        // Check supply cap before proceeding
        let max_supply = Self::get_max_supply(&env);
        if max_supply > 0 {
            let current_supply = Self::get_current_supply(&env);
            if current_supply >= max_supply {
                panic!("Maximum supply reached: {} / {}", current_supply, max_supply);
            }
        }
        
        // Get the native asset (XLM) contract address
        let native_asset_address = Self::get_native_asset_address(&env);
        let native_token = token::Client::new(&env, &native_asset_address);
        
        // Require authorization from the recipient (they must sign the transaction)
        // This ensures they are paying for the mint
        // Note: In Soroban, we cannot easily distinguish between account addresses (G...) 
        // and contract addresses (C...) at runtime. The require_auth() ensures the address
        // authorizes the transaction, which provides some protection against malicious contracts.
        to.require_auth();
        
        // Transfer 0.1 XLM (1,000,000 stroops) from the recipient to the contract as payment
        let mint_cost: i128 = 1_000_000; // 0.1 XLM in stroops
        
        // Check recipient balance before attempting transfer
        let recipient_balance = native_token.balance(&to);
        if mint_cost > recipient_balance {
            panic!("Insufficient balance: recipient has {} but needs {}", recipient_balance, mint_cost);
        }
        
        // Transfer payment first (checks-effects-interactions pattern)
        native_token.transfer(&to, &contract_address, &mint_cost);
        
        // Mint the NFT to the recipient
        // If this fails, the entire transaction reverts, including the payment transfer
        let token_id = Base::sequential_mint(&env, &to);
        
        // Increment supply counter after successful mint
        Self::increment_supply(&env);
        
        token_id
    }

    /// Withdraw XLM from the contract to the owner
    /// 
    /// # Arguments
    /// * `amount` - The amount of XLM (in stroops) to withdraw. If None, withdraws all available balance.
    /// 
    /// # Note
    /// Only the contract owner can call this function. The function transfers XLM from the contract
    /// address to the owner's address. This allows the owner to withdraw minting fees collected by the contract.
    pub fn withdraw(env: Env, amount: Option<i128>) -> i128 {
        // Require that the caller is the owner
        let owner = ownable::get_owner(&env).expect("Contract has no owner");
        owner.require_auth();
        
        // Get the native asset (XLM) contract address
        let native_asset_address = Self::get_native_asset_address(&env);
        let native_token = token::Client::new(&env, &native_asset_address);
        
        let contract_address = env.current_contract_address();
        
        // Get the contract's balance
        let contract_balance = native_token.balance(&contract_address);
        
        // Determine how much to withdraw
        let withdraw_amount = match amount {
            Some(amt) => {
                // Validate amount is positive
                if amt <= 0 {
                    panic!("Amount must be positive, got: {}", amt);
                }
                // Validate that requested amount doesn't exceed balance
                if amt > contract_balance {
                    panic!("Insufficient balance: requested {} but contract has {}", amt, contract_balance);
                }
                amt
            }
            None => contract_balance, // Withdraw all if no amount specified
        };
        
        // Transfer XLM from contract to owner
        native_token.transfer(&contract_address, &owner, &withdraw_amount);
        
        withdraw_amount
    }
}

#[contractimpl]
impl NonFungibleToken for NonFungibleTokenContract {
    type ContractType = Base;
}

#[contractimpl]
impl NonFungibleBurnable for NonFungibleTokenContract {}

#[contractimpl]
impl Ownable for NonFungibleTokenContract {}

#[cfg(test)]
mod test;
