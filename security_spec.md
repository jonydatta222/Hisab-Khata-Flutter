# Security Specification

## Data Invariants
- Each document in the `users` collection is identified by a lowercase user email.
- The document contains the entire ledger data including `transactions`, `expenses`, `shopName`, and `updatedAt`.
- The email (document ID) must be a valid non-empty string under 120 characters.
- Shop name must be a string under 150 characters.

## The "Dirty Dozen" Payloads
1. **Invalid Document ID (Resource Poisoning)**: Document ID containing non-email junk characters or > 120 characters.
2. **Missing Transactions field**: Writing data without the `transactions` key.
3. **Transactions not a list**: Writing `transactions` as a string instead of a list.
4. **Missing Expenses field**: Writing data without the `expenses` key.
5. **Expenses not a list**: Writing `expenses` as an object instead of a list.
6. **Missing Shop Name**: Writing data without the `shopName` key.
7. **Shop Name not a string**: Writing `shopName` as an integer.
8. **Shop Name too large**: Writing `shopName` with a 200 character string.
9. **Missing UpdatedAt**: Writing data without the `updatedAt` key.
10. **UpdatedAt not an integer**: Writing `updatedAt` as a string.
11. **Extra fields (Shadow Update)**: Writing extra keys to the document to inject malicious flags.
12. **Unauthorized Deletion**: Trying to delete a user's ledger data document.

## The Test Runner (firestore.rules.test.ts)
```typescript
// Test suites to verify that all invalid configurations are denied by security rules.
```
