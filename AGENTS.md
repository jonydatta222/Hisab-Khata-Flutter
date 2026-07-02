# Project-Specific AI Agent Instructions

These instructions are persistent rules and project-specific guidelines for any AI coding agent working on this repository.

## GitHub Android Build Rules (স্থায়ী সমাধান ও নির্দেশনাবলী)

যখন ব্যবহারকারী বলবে **"github এর জন্য অ্যাপস রেডি করে দাও"** বা GitHub এর জন্য অ্যাপ রিলিজ করতে বলবে, তখন নিচে উল্লেখিত সেটিংস ও কনফিগারেশন হুবহু বজায় রাখতে হবে। এটি না করলে Gradle এবং Android build প্রসেস ভেঙে যাবে।

### 1. Gradle Wrapper Generation Rule
Android build-এ `com.android.internal.application` প্লাগইন evaluation এর সময় `InternalProblems` বা সার্ভিস ইনিশিয়ালাইজেশন এর মতো এরর এড়াতে Gradle wrapper জেনারেট করার সময় এই বিশেষ পদ্ধতি অবলম্বন করতে হবে:

- সরাসরি `./android` ডিরেক্টরিতে `gradle wrapper` কমান্ড চালানো যাবে না।
- একটি সম্পূর্ণ আলাদা টেম্পোরারি ডিরেক্টরি তৈরি করে সেখানে একটি খালি `settings.gradle` ফাইল তৈরি করতে হবে, যাতে গ্র্যাডল হোস্ট মেশিনের Daemon দিয়ে মূল প্রজেক্টকে evaluated করার চেষ্টা না করে।
- সেই টেম্পোরারি ফোল্ডারে ক্লিন উপায়ে `gradle wrapper --gradle-version 8.14.3 --distribution-type all` রান করতে হবে।
- জেনারেট হওয়া ফাইলগুলো (`gradlew`, `gradle-wrapper.jar`, `gradle-wrapper.properties`) প্রজেক্টের `android/` ডিরেক্টরিতে কপি করতে হবে।

### 2. GitHub Actions Workflow Configuration
`/.github/workflows/android.yml` ফাইলে নিচের ধাপটি হুবহু বজায় রাখুন:

```yaml
      - name: Generate clean and valid Gradle Wrapper
        run: |
          echo "=== Creating a temporary directory with blank settings.gradle ==="
          mkdir -p /tmp/gradle-wrapper-temp
          cd /tmp/gradle-wrapper-temp
          touch settings.gradle
          
          echo "=== Generating clean Gradle 8.14.3 wrapper ==="
          gradle wrapper --gradle-version 8.14.3 --distribution-type all
          
          echo "=== Copying clean wrapper files to project ==="
          cd $GITHUB_WORKSPACE
          mkdir -p android/gradle/wrapper
          cp /tmp/gradle-wrapper-temp/gradlew android/gradlew
          cp /tmp/gradle-wrapper-temp/gradle/wrapper/gradle-wrapper.jar android/gradle/wrapper/gradle-wrapper.jar
          cp /tmp/gradle-wrapper-temp/gradle/wrapper/gradle-wrapper.properties android/gradle/wrapper/gradle-wrapper.properties
          
          echo "=== Verifying the generated files ==="
          ls -la android/gradlew
          ls -la android/gradle/wrapper/
```

এই নিয়মগুলো কঠোরভাবে মেনে চলতে হবে যাতে পরবর্তীতে নতুন কোনো ফিচার যোগ করলেও GitHub-এ APK বিল্ড করার সময় কোনো সমস্যা না হয়।
