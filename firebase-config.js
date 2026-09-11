rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function isSignedIn() { return request.auth != null; }
    function isAdmin() {
      return isSignedIn() &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'ADMIN';
    }
    function isOwner(uid) { return isSignedIn() && request.auth.uid == uid; }

    match /users/{userId} {
      allow get: if isOwner(userId) || isAdmin();
      allow list: if isAdmin();
      allow create: if isOwner(userId)
        && request.resource.data.role == 'STUDENT'
        && request.resource.data.status == 'ACTIVE';
      allow update: if isAdmin() || (
        isOwner(userId)
        && request.resource.data.role == resource.data.role
        && request.resource.data.status == resource.data.status
      );
      allow delete: if isAdmin();
    }

    match /units/{unitId} {
      allow read: if resource.data.isPublished == true || isAdmin();
      allow write: if isAdmin();
    }
    match /lessons/{lessonId} {
      allow read: if resource.data.isPublished == true || isAdmin();
      allow write: if isAdmin();
    }

    match /offers/{offerId} {
      allow read: if true;
      allow write: if isAdmin();
    }
    match /settings/{id} {
      allow read: if true;
      allow write: if isAdmin();
    }

    match /orders/{orderId} {
      allow get: if isOwner(resource.data.userId) || isAdmin();
      allow list: if isAdmin() || (isSignedIn() && resource.data.userId == request.auth.uid);
      allow create: if isSignedIn()
        && request.resource.data.userId == request.auth.uid
        && request.resource.data.total is number
        && request.resource.data.total > 0;
      allow update: if isAdmin() || (
        isOwner(resource.data.userId) && request.resource.data.userId == resource.data.userId
      );
      allow delete: if isAdmin();
    }

    match /enrollments/{enrollmentId} {
      allow get: if isAdmin() || (isSignedIn() && resource.data.userId == request.auth.uid);
      allow list: if isAdmin() || (isSignedIn() && resource.data.userId == request.auth.uid);
      allow create: if isAdmin() || (
        isSignedIn()
        && request.resource.data.userId == request.auth.uid
        && request.resource.data.orderId != null
        && get(/databases/$(database)/documents/orders/$(request.resource.data.orderId)).data.status == 'PAID'
        && get(/databases/$(database)/documents/orders/$(request.resource.data.orderId)).data.userId == request.auth.uid
      );
      allow update, delete: if isAdmin();
    }

    match /progress/{progressId} {
      allow get: if isAdmin() || (isSignedIn() && resource.data.userId == request.auth.uid);
      allow list: if isAdmin() || (isSignedIn() && resource.data.userId == request.auth.uid);
      allow create, update: if isSignedIn() && request.resource.data.userId == request.auth.uid;
      allow delete: if isAdmin();
    }
  }
        }
