// Shim sementara selama refactoring ke src/claims. Dihapus di langkah A8.
export { CATEGORIES, type Category, type ClaimInput } from "./claims/domain/claim";
export { validateClaim } from "./claims/domain/validate-claim";
