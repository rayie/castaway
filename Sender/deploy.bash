#gsutil rm gs://castaway-receiver/receiver.html
gsutil -h "Cache-Control:public,no-cache,must-revalidate" -h "Content-Type:text/html" cp sender.html gs://song-chords/sender.html
gsutil acl ch -u AllUsers:R gs://song-chords/sender.html
