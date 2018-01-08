#gsutil rm gs://castaway-receiver/receiver.html
gsutil -h "Cache-Control:public,no-cache,must-revalidate" -h "Content-Type:text/html" cp receiver.html gs://castaway-receiver/receiverB.html
gsutil acl ch -u AllUsers:R gs://castaway-receiver/receiverB.html
