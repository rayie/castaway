rm index.zip 
cd lambda
zip -r "../index.zip" *
cd ..
aws lambda update-function-code --function-name CastAwayFetch --zip-file fileb://index.zip
#aws lambda update-function-configuration --function-name CastAwayFetch --timeout 12 
